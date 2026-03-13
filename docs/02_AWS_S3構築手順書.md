# 02. AWS S3 構築手順書

> Libecity Snap の写真保存先となる S3 バケットの作成・設定手順

## 前提条件

| 項目 | 要件 |
|------|------|
| **AWSアカウント** | 作成済みであること |
| **権限** | S3バケット作成 + IAMユーザー作成の権限があること |

---

## 概要

Libecity Snap では、S3を以下の用途で使用します:

- **Presigned URLによるアップロード**: ゲストのブラウザから直接S3へ写真をPUT
- **Presigned URLによるダウンロード**: 管理者の一括ダウンロード時
- **Next.js Image最適化**: `next/image` コンポーネントによる画像表示

バケットは**完全プライベート**（パブリックアクセスなし）で運用し、すべてのアクセスはPresigned URLまたはIAM認証を通じて行います。

---

## Step 1: S3バケットの作成

### 1-1. S3コンソールを開く

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/) にサインイン
2. 上部の検索バーで「S3」と検索し、S3サービスを開く

### 1-2. バケットを作成

1. **「バケットを作成」** をクリック

2. **一般的な設定**:
   | 項目 | 設定値 |
   |------|--------|
   | バケット名 | `libecity-snap-photos`（グローバルで一意な名前） |
   | AWSリージョン | `アジアパシフィック (東京) ap-northeast-1` |

   > **重要**: リージョンは作成後に変更できません。`.env` の `AWS_REGION` と必ず一致させてください。リージョンが異なると **301リダイレクトエラー** が発生します。

3. **オブジェクト所有者**: 「ACL無効（推奨）」のまま

4. **このバケットのブロックパブリックアクセス設定**:
   - **「パブリックアクセスをすべてブロック」にチェックが入っていることを確認**（デフォルトでON）

5. **バケットのバージョニング**: 「無効にする」のまま

6. **デフォルトの暗号化**: SSE-S3（デフォルト）のまま

7. **「バケットを作成」** をクリック

### 1-3. リージョンの確認

バケット作成後、以下の方法でリージョンを確認できます:

**コンソールで確認:**
- S3 > バケット一覧画面で「AWSリージョン」列を確認

**AWS CLIで確認:**
```bash
aws s3api get-bucket-location --bucket libecity-snap-photos
```

> `us-east-1` の場合は `null` が返されます（AWS仕様）。

---

## Step 2: CORS設定

ブラウザからPresigned URLでS3に直接アップロードするには、CORS（Cross-Origin Resource Sharing）の設定が必要です。

### 2-1. CORS設定を編集

1. S3コンソールで作成したバケットを開く
2. **「アクセス許可」** タブをクリック
3. **「Cross-Origin Resource Sharing (CORS)」** セクションまでスクロール
4. **「編集」** をクリック
5. 以下のJSONを貼り付け:

#### 開発環境用（localhost + LAN許可）

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://192.168.1.12:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> **スマホからテストする場合**: `AllowedOrigins` にPCのLAN IPアドレス（例: `http://192.168.1.12:3000`）を追加してください。LAN IPは `ipconfig`（Windows）または `ifconfig`（Mac/Linux）で確認できます。この設定がないと、スマホからの写真アップロード時にCORSエラー（「ネットワークエラー」）が発生します。

#### 本番環境用（Amplifyデプロイ後にドメインを設定）

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "https://main.xxxxxxxxxxxx.amplifyapp.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

6. **「変更の保存」** をクリック

| フィールド | 説明 |
|-----------|------|
| `AllowedHeaders` | `["*"]` でリクエストヘッダーをすべて許可（Presigned URLに必要） |
| `AllowedMethods` | `PUT`（アップロード）と `GET`（ダウンロード/表示） |
| `AllowedOrigins` | アプリのオリジン。本番デプロイ後に正しいドメインに更新すること |
| `ExposeHeaders` | `ETag` をブラウザに公開（アップロード完了確認に使用） |
| `MaxAgeSeconds` | プリフライトリクエストのキャッシュ時間（3600秒 = 1時間） |

---

## Step 3: IAMユーザーの作成

S3にアクセスするための専用IAMユーザーを作成し、アクセスキーを発行します。

### 3-1. IAMポリシーの作成

1. [IAMコンソール](https://console.aws.amazon.com/iam/) を開く
2. 左メニューの **「ポリシー」** > **「ポリシーを作成」**
3. **「JSON」** タブをクリックし、以下を貼り付け:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LibecitySnapS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::libecity-snap-photos/*"
    }
  ]
}
```

> **重要**: `Resource` のバケット名は実際に作成したバケット名に合わせてください。末尾の `/*` はバケット内のオブジェクトを対象とするために必要です。

4. **「次へ」** をクリック
5. ポリシー名: `LibecitySnapS3Policy`
6. **「ポリシーの作成」** をクリック

### 3-2. IAMユーザーの作成

1. IAMコンソール > **「ユーザー」** > **「ユーザーを追加」**
2. ユーザー名: `libecity-snap-s3`
3. **「次へ」** をクリック
4. **「ポリシーを直接アタッチする」** を選択
5. 検索バーで `LibecitySnapS3Policy` を検索し、チェックを入れる
6. **「次へ」** > **「ユーザーの作成」**

### 3-3. アクセスキーの発行

1. 作成したユーザー `libecity-snap-s3` をクリック
2. **「セキュリティ認証情報」** タブを開く
3. **「アクセスキー」** セクションで **「アクセスキーを作成」** をクリック
4. ユースケース: **「AWS の外部で実行されるアプリケーション」** を選択
5. **「次へ」** > **「アクセスキーを作成」**
6. **アクセスキーID** と **シークレットアクセスキー** を控える

> **警告**: シークレットアクセスキーはこの画面でしか表示されません。必ずこの時点で安全な場所に保存してください。紛失した場合は新しいキーを再発行する必要があります。

### 3-4. 環境変数に設定

取得したキーを `.env` に設定します:

```env
AWS_ACCESS_KEY_ID=AKIA...（アクセスキーID）
AWS_SECRET_ACCESS_KEY=...（シークレットアクセスキー）
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=libecity-snap-photos
```

---

## Step 4: 動作確認

### 4-1. アップロードテスト

1. 開発サーバーを起動: `npm run dev`
2. `http://localhost:3000` にアクセス
3. PIN入力 → ニックネーム登録 → シーン選択 → 写真アップロード
4. エラーなくアップロードが完了すれば成功

### 4-2. S3コンソールで確認

1. S3コンソールでバケットを開く
2. `photos/` フォルダ内にUUID形式のファイル（例: `6a048f70-821a-4563-be05-f76514e13d40.jpg`）が存在すればOK

### 4-3. 画像表示の確認

アルバム画面 (`/album`) で写真が表示されることを確認します。

**301エラーが出る場合:**
- `.env` の `AWS_REGION` がバケットの実際のリージョンと一致しているか確認
- `next.config.ts` の `remotePatterns` が正しいホスト名を生成しているか確認

---

## セキュリティに関する注意事項

| 項目 | 対策 |
|------|------|
| バケットのパブリックアクセス | すべてブロック（デフォルト設定を維持） |
| IAMポリシー | 最小権限の原則（PutObject + GetObject + DeleteObject） |
| アクセスキー | `.env` に保存し、Gitにコミットしない（`.gitignore` で除外済み） |
| Presigned URL | 15分で有効期限切れ |
| ファイルサイズ | アプリ側で10MBに制限 |

---

*作成日: 2026-03-11*
