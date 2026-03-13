# 03. Turso データベース構築手順書

> Libecity Snap の本番データベース（Turso）のセットアップ手順

## 前提条件

| 項目 | 要件 |
|------|------|
| **WSL** | Windows の場合は WSL（Windows Subsystem for Linux）が必要 |
| **GitHub アカウント** | Turso のサインアップに使用 |

> **注意**: Turso CLI はネイティブ Windows では動作しません。Windows ユーザーは WSL 内で操作してください。

---

## 概要

Libecity Snap では Turso（ホスト型 libSQL / SQLite）をプロダクションDBとして使用します。

| 項目 | 内容 |
|------|------|
| 用途 | Guest / Scene / Photo テーブルの管理 |
| 接続方式 | Prisma ORM + `@prisma/adapter-libsql` |
| 開発時 | ローカルSQLite（`prisma/dev.db`）を自動使用 |
| 本番時 | Turso のリモートDB に接続 |

### Turso 無料プラン（Starter）の制限

| リソース | 上限 |
|---------|------|
| データベース数 | 500 |
| ストレージ | 5 GB |
| 行読み取り | 5億行 / 月 |
| 行書き込み | 1,000万行 / 月 |
| クレジットカード | 不要 |

> Libecity Snap の利用規模（ゲスト50〜100人、写真数百枚）では無料プランで十分です。

---

## Step 1: Turso CLI のインストール

### macOS（Homebrew）

```bash
brew install tursodatabase/tap/turso
```

### Linux / WSL

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

インストール後、シェルを再起動するか以下を実行:

```bash
source ~/.bashrc   # bash の場合
source ~/.zshrc    # zsh の場合
```

### インストール確認

```bash
turso --version
```

---

## Step 2: Turso にサインアップ / ログイン

### 初回サインアップ

```bash
turso auth signup --headless
```

> **WSL の場合**: WSL ではブラウザを自動起動できないため `--headless` が必須です。ターミナルに表示される URL を Windows 側のブラウザで開き、GitHub 認証を完了してください。

### 2回目以降のログイン

```bash
turso auth login --headless
```

---

## Step 3: データベースの作成

### 3-1. 東京リージョンでDBを作成

```bash
turso db create libecity-snap --location aws-ap-northeast-1
```

| オプション | 説明 |
|-----------|------|
| `libecity-snap` | データベース名（任意） |
| `--location aws-ap-northeast-1` | 東京リージョン（AWS AP NorthEast）を指定 |

> `--location` を省略するとデフォルトリージョンが使用されます。利用可能なリージョンは `turso db locations` で確認できます。

### 3-2. 作成確認

```bash
turso db list
```

作成したデータベースが一覧に表示されればOKです。

---

## Step 4: 接続情報の取得

### 4-1. データベースURL の取得

```bash
turso db show libecity-snap --url
```

出力例:

```
libsql://libecity-snap-<username>.turso.io
```

### 4-2. 認証トークンの作成

```bash
turso db tokens create libecity-snap
```

JWT形式のトークンが出力されます。

> **オプション**: 有効期限を設定する場合は `--expiration 90d`（90日）のように指定できます。省略するとトークンは無期限です。

### 4-3. 環境変数に設定

取得した値を `.env` に設定します:

```env
TURSO_DATABASE_URL=libsql://libecity-snap-<username>.turso.io
TURSO_AUTH_TOKEN=eyJ...（取得したトークン）
```

> **重要**: `.env` の `TURSO_DATABASE_URL` から `xxx` のプレースホルダーを削除してください。`xxx` が含まれていると、アプリはローカルSQLiteにフォールバックします。

---

## Step 5: スキーマの反映

ローカルの Prisma スキーマを Turso のリモートDBに反映します。

### 方法A: `prisma migrate diff` + Turso CLI（推奨）

SQLを生成して Turso CLI で適用する方法です。確実に動作します。

```bash
# 1. マイグレーションSQLを生成
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql

# 2. Turso CLI で適用
turso db shell libecity-snap < migration.sql
```

### 方法B: `prisma db push`（簡易）

> **注意**: Prisma v6.18.0 以降では `prisma db push` がローカルの `dev.db` にしか反映されない場合があります。その場合は方法Aを使ってください。

```bash
npx prisma db push
```

### 5-1. スキーマ反映の確認

```bash
turso db shell libecity-snap
```

対話型シェルが開いたら:

```sql
.tables
```

以下のテーブルが表示されればOK:

```
Guest   Photo   Scene
```

`.quit` で終了します。

---

## Step 6: シードデータの投入

Turso のリモートDB にシードデータを投入します。

### 方法A: Turso CLI で直接投入（推奨）

```bash
turso db shell libecity-snap <<EOF
INSERT OR IGNORE INTO Scene (id, name, sortOrder) VALUES (1, 'イベント', 1);
INSERT OR IGNORE INTO Scene (id, name, sortOrder) VALUES (2, '懇親会', 2);
INSERT OR IGNORE INTO Scene (id, name, sortOrder) VALUES (3, 'フリータイム', 3);
EOF
```

### 方法B: アプリ経由

`.env` に正しい Turso 接続情報を設定した状態で:

```bash
npm run db:seed
```

> **注意**: `npm run db:seed` は `PrismaClient()` を直接インスタンス化するため、`src/lib/prisma.ts` の Turso 判定ロジックを通りません。ローカルSQLite に投入される可能性があります。本番DB への確実な投入には方法Aを推奨します。

### 6-1. 投入確認

```bash
turso db shell libecity-snap "SELECT * FROM Scene;"
```

---

## Step 7: 接続テスト

### 7-1. アプリからの接続確認

1. `.env` に正しい Turso 接続情報が設定されていることを確認
2. 開発サーバーを起動: `npm run dev`
3. `http://localhost:3000` にアクセス
4. PIN入力 → ニックネーム登録が成功すれば、Turso への接続が正常に動作しています

### 7-2. Turso ダッシュボードで確認

[Turso ダッシュボード](https://turso.tech/app) にログインし、データベースの使用状況を確認できます。

---

## トラブルシューティング

### `turso: command not found`

→ CLI のインストール先がPATHに含まれていません:

```bash
export PATH="$HOME/.turso:$PATH"
```

永続化するには `~/.bashrc` または `~/.zshrc` に上記を追記してください。

### `Error: Network error` （Turso接続エラー）

- `TURSO_DATABASE_URL` の形式が `libsql://...` で始まっているか確認
- `TURSO_AUTH_TOKEN` が正しいか確認（`turso db tokens create` で再発行可能）
- ファイアウォールやプロキシが HTTPS 通信をブロックしていないか確認

### `prisma db push` がローカルにしか反映されない

Prisma v6.18.0 以降の既知の問題です。方法A（`prisma migrate diff` + `turso db shell`）を使用してください。

---

*作成日: 2026-03-11*
