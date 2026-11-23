# Web Tool Template (Svelte 5 + Hono + Drizzle SQLite)

Svelte 5（静的サイト出力）と Hono + Drizzle ORM（SQLite）による、ファイルベースルーティング対応のWebアプリケーションテンプレートです。
サーバールート（`/`）だけでなく任意のサブディレクトリ（例: `/tools/my-tool/`）にそのまま配置して動作するように設計されています。

> **AIエージェント向けの仕様説明書**: 開発をAIに担当させるための詳細な仕様・ルールは [`AGENTS.md`](./AGENTS.md) および [`file_structure.md`](./file_structure.md) に記載されています。

## 特徴

- **フロントエンド**: Vite + Svelte 5 (Runes) + Tailwind CSS v4 による完全な静的ビルド（Svelte側でのSSR/バックエンド処理なし）
- **モバイルWebアプリ登録（PWA）対応**: `public/manifest.webmanifest`・各種アイコン・Service Worker (`public/sw.js`) をすべて相対パス（`./`）で構成。サブディレクトリにデプロイされた状態でも、iOS / Android の「ホーム画面に追加（アプリとしてインストール）」からスタンドアロンWebアプリとして登録・起動可能
- **バックエンド**: `api/*.ts` の TypeScript ファイルを PHP のように Hono サーバー上で動的に読み込んで実行（各ファイルは `export default async (c: Context) => c.json(...)` をエクスポート）
- **データベース**: `_db/` に Drizzle ORM の定義、`_data/db.sqlite` に SQLite データベースを格納しプロジェクト内で一元管理
- **アクセス制御**:
  - `_`（アンダースコア）で始まるディレクトリ（`_db/`, `_data/` 等）は外部から直接アクセス不可（403）
  - ただし `_data/public/` のみ例外として公開され、DBレコードに紐づく画像などを `./_data/public/...` の相対パスでフロントエンドから直接参照可能
- **ローカル開発環境**: `@hono/vite-dev-server` により、上記の本番サーバー仕様をローカルでそのままエミュレート
- **一括ビルド出力**: `vite build` 実行時に、フロントエンドのビルド成果物 (`dist/index.html`, `dist/assets/`, `dist/manifest.webmanifest` 等) とともにバックエンド用の `api/` と `_db/` も `dist/` に出力

## ディレクトリ構成

詳細は [`file_structure.md`](./file_structure.md) を参照してください。

```text
[開発環境: projects/my-tool/]
├── index.html
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── main.ts
│   ├── +page.svelte
│   └── lib/api.ts
├── api/
│   ├── get-items.ts
│   ├── add-item.ts
│   └── delete-item.ts
├── _db/
│   ├── schema.ts
│   └── index.ts
├── _data/               # (.gitignore)
│   ├── db.sqlite
│   ├── uploads/
│   └── public/
├── dist/                # (.gitignore)
├── vite.config.ts
└── package.json
```

## 使い方

### 1. 開発サーバーの起動

```sh
bun run dev
# または npm run dev
```

初回アクセス時に `_data/db.sqlite`、`items` テーブル、およびサンプル画像 `_data/public/sample-icon.svg` が自動生成されます。

### 2. 本番用ビルド

```sh
bun run build
# または npm run build
```

`dist/` ディレクトリに本番デプロイ用のスクリプト領域ファイル一式（`index.html`, `manifest.webmanifest`, `sw.js`, アイコン類, `assets/`, `api/`, `_db/`）が出力されます。
デプロイ先のディレクトリ（例: `www/tools/my-tool/`）に `dist/` の中身を配置してください（本番側の `_data/` ディレクトリは保護され、上書きされません）。

### 3. ビルド結果のプレビュー・テスト

```sh
# ローカルでの本番ビルドプレビュー
bun run preview

# 型チェック
bun run check

# テスト実行 (Vitest + Playwright E2E)
bun run test
```
