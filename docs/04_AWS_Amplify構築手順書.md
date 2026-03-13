# 04. AWS Amplify 構築手順書

> Libecity Snap を AWS Amplify Hosting にデプロイする手順

## 前提条件

| 項目 | 要件 |
|------|------|
| **AWSアカウント** | 作成済み |
| **GitHubリポジトリ** | Libecity Snap のコードがプッシュ済み |
| **S3バケット** | [02_AWS_S3構築手順書.md](./02_AWS_S3構築手順書.md) 完了済み |
| **Turso DB** | [03_Turso_DB構築手順書.md](./03_Turso_DB構築手順書.md) 完了済み |

---

## 概要

AWS Amplify Hosting は、GitHub リポジトリと連携して git push 時に自動ビルド・デプロイを行うフルマネージドホスティングサービスです。

| 項目 | 内容 |
|------|------|
| 対応フレームワーク | Next.js 12〜15（公式サポート） |
| SSR | サポート済み（App Router対応） |
| 画像最適化 | `next/image` を自動でサポート（Sharp内蔵） |
| CI/CD | git push で自動ビルド・デプロイ |

> **Next.js 16 に関する注意**: AWS Amplify が公式サポートしている Next.js は v12〜15 です。Next.js 16 は公式リストに含まれていないため、デプロイ時に問題が発生する可能性があります。問題が起きた場合は Next.js 15 にダウングレードすることを検討してください。

### Amplify Hosting 無料枠（AWSアカウント作成から12か月間）

| リソース | 無料枠（月額） |
|---------|---------------|
| ビルド時間 | 1,000分 |
| ストレージ（CDN） | 5 GB |
| データ転送 | 15 GB |
| SSRリクエスト | 50万リクエスト |
| SSR処理時間 | 100 GB時間 |

---

## Step 1: Amplify アプリの作成

### 1-1. Amplify コンソールを開く

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/) にサインイン
2. 上部の検索バーで「Amplify」と検索し、AWS Amplify を開く

### 1-2. 新規アプリの作成

1. **「新しいアプリを作成」** をクリック
2. Git プロバイダーとして **「GitHub」** を選択
3. **「GitHub で認証」** をクリックし、AWS Amplify に GitHub リポジトリへのアクセスを許可
4. リポジトリ一覧から **libecity-snap** を選択
5. ブランチとして **`main`** を選択
6. **「次へ」** をクリック

### 1-3. ビルド設定

Amplify は `package.json` から Next.js を自動検出してビルド設定を提案します。

**自動検出の内容を確認し、以下の設定であることを確認:**

- フレームワーク: Next.js - SSR
- ビルド出力ディレクトリ: `.next`

### 1-4. サービスロールの設定

1. **「新しいサービスロールを作成して使用」** を選択（初回の場合）
2. または既存のロールを選択

### 1-5. 詳細設定を開く

**「詳細設定」** を展開し:

- Node.js バージョン: **20** を選択（20以上が必要）

### 1-6. デプロイ

1. 設定を確認し **「保存してデプロイ」** をクリック
2. 初回ビルドが自動的に開始されます

> **注意**: 環境変数を設定する前にデプロイすると、ビルドは成功しても実行時エラーになります。次のStepで環境変数を設定してください。

---

## Step 2: 環境変数の設定

### 2-1. 環境変数画面を開く

1. Amplify コンソールでアプリを開く
2. 左メニューの **「ホスティング」** > **「環境変数」** をクリック
3. **「変数を管理」** をクリック

### 2-2. 環境変数を追加

以下のすべての環境変数を追加します:

| 変数名 | 値 | ブランチ |
|--------|-----|---------|
| `EVENT_PIN` | 本番用PIN（4桁） | すべて |
| `ADMIN_PIN` | 管理者用PIN（4桁） | すべて |
| `TURSO_DATABASE_URL` | `libsql://libecity-snap-xxx.turso.io` | すべて |
| `TURSO_AUTH_TOKEN` | Turso のJWTトークン | すべて |
| `AWS_ACCESS_KEY_ID` | IAMアクセスキー | すべて |
| `AWS_SECRET_ACCESS_KEY` | IAMシークレットキー | すべて |
| `AWS_REGION` | `ap-northeast-1` | すべて |
| `S3_BUCKET_NAME` | `libecity-snap-photos` | すべて |
| `UPLOAD_RESTRICTION_ENABLED` | `false`（テスト時）/ `true`（本番当日） | すべて |
| `NEXT_PUBLIC_EVENT_DATE` | `2027-01-31` | すべて |

> **重要**: `NEXT_PUBLIC_` プレフィックスの変数はビルド時にクライアントコードに埋め込まれます。それ以外のサーバーサイド変数はランタイムで利用するために追加の設定が必要です（Step 3参照）。

### 2-3. 保存

**「保存」** をクリックします。

---

## Step 3: amplify.yml の確認

サーバーサイドの環境変数をランタイムで利用可能にするため、プロジェクトルートに `amplify.yml` が配置されています。このファイルは Amplify のビルド設定を上書きし、カスタムのビルドプロセスを定義します。

> **重要**: Amplify コンソールのデフォルトビルド設定ではなく、リポジトリに含まれる `amplify.yml` の設定が優先されます。Amplify コンソール上でビルド設定を手動変更する必要はありません。

### 3-1. amplify.yml の内容

プロジェクトルートの `amplify.yml` に以下の内容が記述されています:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - env | grep -E '^(EVENT_PIN|ADMIN_PIN|TURSO_|S3_|UPLOAD_|NEXT_PUBLIC_)' >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
```

**Amplify のデフォルト設定との主な違い:**

| 項目 | デフォルト | 本プロジェクト（amplify.yml） |
|------|-----------|------------------------------|
| npm install | `npm ci` | `npm ci --cache .npm --prefer-offline`（キャッシュ活用で高速化） |
| 環境変数書き出し | なし | `env \| grep -E ...` で `.env.production` に書き出し |
| Prisma 生成 | なし | `npm run build` 内で自動実行（`build` スクリプトが `prisma generate && next build`） |
| キャッシュ対象 | `node_modules` | `.npm`（npm キャッシュ）+ `.next/cache`（ビルドキャッシュ） |

**各フェーズの説明:**

| フェーズ | コマンド | 説明 |
|---------|---------|------|
| preBuild | `npm ci --cache .npm --prefer-offline` | 依存パッケージをクリーンインストール（`.npm` キャッシュを活用して高速化） |
| build | `env \| grep -E ... >> .env.production` | サーバーサイド環境変数を `.env.production` に一括書き出し |
| build | `npm run build` | Next.js のプロダクションビルド |

> **なぜ `.env.production` に書き出すのか?**: Amplify の環境変数はビルド時には利用できますが、SSRランタイム時にはデフォルトで利用できません。`.env.production` に書き出すことで、Next.js がランタイム時にも環境変数を読み込めるようになります。
>
> **なぜ `.npm` キャッシュを使うのか?**: `node_modules` をキャッシュするよりも `.npm` キャッシュ + `--prefer-offline` の方がディスク効率が良く、`npm ci` の整合性チェックも維持できます。

### 3-2. Git にコミット・プッシュ

`amplify.yml` は既にリポジトリに含まれています。変更を加えた場合は以下でプッシュしてください:

```bash
git add amplify.yml
git commit -m "Update amplify.yml"
git push origin main
```

プッシュすると Amplify が自動的に再ビルドを開始します。

---

## Step 4: デプロイの確認

### 4-1. ビルドログの確認

1. Amplify コンソールでアプリを開く
2. 最新のデプロイをクリック
3. 各フェーズ（プロビジョン → ビルド → デプロイ）のログを確認
4. すべてのフェーズが緑色（成功）になることを確認

### 4-2. アプリの動作確認

デプロイ成功後、Amplify が自動生成するURLでアプリにアクセスできます:

```
https://main.<app-id>.amplifyapp.com
```

以下を確認:
- [ ] PIN入力画面が表示される
- [ ] PIN入力 → ニックネーム登録が成功する
- [ ] 写真のアップロードが成功する
- [ ] アルバム画面で写真が表示される
- [ ] 管理画面にアクセスできる

### 4-3. S3 CORS の更新

デプロイ後、S3 の CORS 設定に Amplify のドメインを追加してください:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "https://main.<app-id>.amplifyapp.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Step 5: カスタムドメインの設定（任意）

### 5-1. Route 53 でドメインを管理している場合

1. Amplify コンソール > **「ホスティング」** > **「カスタムドメイン」**
2. **「ドメインを追加」** をクリック
3. ルートドメインを入力（例: `wedding.example.com`）
4. Route 53 で管理されている場合はドロップダウンに表示される
5. SSL 証明書が自動でプロビジョニングされる
6. DNS レコード（ALIAS + TXT）が自動設定される

### 5-2. 外部レジストラの場合

1. Amplify が表示する CNAME レコードを、ドメインレジストラの DNS 設定に追加
2. SSL 証明書の検証用 CNAME も追加
3. DNS 伝播を待つ（通常10分〜48時間）

> カスタムドメインを設定した場合は、S3 の CORS 設定の `AllowedOrigins` も更新してください。

---

## Step 6: 本番当日の設定変更

イベント当日（2027-01-31）に向けて、以下の設定を変更します:

### 6-1. アップロード制限の有効化

Amplify コンソールの環境変数で:

```
UPLOAD_RESTRICTION_ENABLED=true
```

に変更し、再デプロイ（git push または手動再ビルド）します。

> これにより、`NEXT_PUBLIC_EVENT_DATE`（2027-01-31）以外の日はアップロードが制限されます。

### 6-2. PIN の変更

本番用の PIN に変更:

```
EVENT_PIN=<本番用4桁PIN>
ADMIN_PIN=<管理者用4桁PIN>
```

---

## Amplify でサポートされていない機能

Libecity Snap の実装で注意が必要な点:

| 機能 | サポート状況 |
|------|-------------|
| SSR（Server-Side Rendering） | サポート済み |
| App Router | サポート済み |
| `next/image` 画像最適化 | サポート済み（Sharp自動組み込み） |
| API Routes | サポート済み |
| Edge Runtime | **非サポート** |
| On-Demand ISR（`revalidatePath`等） | **非サポート** |
| ストリーミング（React Server Components） | **非サポート** |

> Libecity Snap は上記の非サポート機能を使用していないため、問題ありません。

---

## トラブルシューティング

### ビルドエラー: `prisma generate` が失敗する

→ `amplify.yml` の build フェーズで `npx prisma generate` が `npm run build` の前に実行されているか確認してください。

### ランタイムエラー: 環境変数が `undefined`

→ `amplify.yml` の build フェーズで `.env.production` への書き出しが行われているか確認してください。特にサーバーサイドの変数（`TURSO_*`, `AWS_*` 等）は `.env.production` への書き出しが必須です。

### 画像が表示されない（301エラー）

→ `AWS_REGION` がS3バケットの実際のリージョンと一致しているか確認してください。

### CORS エラーでアップロードが失敗する

→ S3 の CORS 設定の `AllowedOrigins` に Amplify のデプロイURLを追加してください。

### Next.js 16 でビルドが失敗する

Amplify の公式サポートは Next.js 15 までです。ビルドが失敗する場合:

```bash
npm install next@15
```

で Next.js 15 にダウングレードして再デプロイしてください。

---

*作成日: 2026-03-11*
