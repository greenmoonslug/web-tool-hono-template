# AI開発者向け仕様説明書 (AGENTS.md)

このプロジェクトは、**Svelte 5 (静的フロントエンド)** と **Hono + Drizzle ORM / SQLite (PHPライクなファイルベース実行バックエンド)** を組み合わせたWebアプリケーションテンプレートです。
AIエージェントがこのテンプレートをベースに機能開発・修正を行う際は、以下のアーキテクチャ仕様と鉄則を厳守してください。

---

## 1. アーキテクチャ概要

1. **フロントエンド（Svelte 5 / 静的サイト生成・モバイルWebアプリ対応）**
   - Svelteエコシステム内ではSSRやサーバー処理（SvelteKitの `+page.server.ts` や `+server.ts` 等）は**一切行いません**。
   - 純粋な Vite + Svelte 5 (Runes) 構成としてビルドし、静的な `index.html` と `assets/` を出力します。
   - iOS / Android デバイスの「ホーム画面に追加（Webアプリとして登録・スタンドアロン起動）」に対応するため、`public/manifest.webmanifest`、`public/sw.js`、および各種アイコン（`public/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`）を備えています。
2. **本番Honoサーバーの仕様（Apache / PHPライクなファイルベースルーティング）**
   - 本番環境はHonoベースのWebサーバー上で動作し、ディレクトリ構造をそのままURLとして公開するファイルベースルーティングを行います。
   - `api/` 配下の `.ts` ファイル（例: `api/get-items.ts`）がリクエストされた際、PHPのようにサーバー内で動的 `import` されて実行されます。
   - 各 `.ts` ファイルは `Hono` インスタンスではなく、**`hono.Context` (`c`) を受け取って `c.json()` や `c.html()` のレスポンスを返す関数を `export default` します**。
   - **`_`（アンダースコア）で始まるディレクトリ（`_db/`, `_data/` 等）の中身は非公開（403 Forbidden）**です。
   - **例外として `_data/public/` のみ公開**されます。ここには「DBレコードに紐づく画像など、フロントエンドから直接参照されるファイル」を配置します。
3. **ローカル開発サーバー (`@hono/vite-dev-server`)**
   - `vite.config.ts` にて `@hono/vite-dev-server` を構成し、本番サーバーと同じルーティング（`/api/*.ts` → 対応する `api/*.ts` の実行、`_data/public/*` の公開、その他 `_` ディレクトリの遮断）をローカルで再現しています。
   - `vite build` 実行時には、フロントエンドの静的ファイル (`dist/index.html`, `dist/assets/`, `dist/manifest.webmanifest` 等) に加え、バックエンド用の `api/` と `_db/` も `dist/` に出力されます。

---

## 2. ディレクトリ構成と役割

詳しいツリー構造は [`file_structure.md`](./file_structure.md) を参照してください。

| パス | 区分 | 公開可否 | 役割 |
| :--- | :--- | :--- | :--- |
| `index.html` | フロントエンド | 公開 | エントリーHTML (`./src/main.ts` や `./manifest.webmanifest` を相対パスで読み込む) |
| `public/manifest.webmanifest` | フロントエンド | 公開(ビルド時直下) | モバイルデバイスへのWebアプリ登録（PWA）用マニフェスト |
| `public/sw.js` | フロントエンド | 公開(ビルド時直下) | PWAインストール要件を満たすための最小Service Worker（パススルー通信） |
| `public/icon*`, `apple-touch-icon.png` | フロントエンド | 公開(ビルド時直下) | ホーム画面登録用アイコン群 |
| `src/main.ts` | フロントエンド | 公開(ビルド後) | Svelteアプリのマウントおよび `./sw.js` の登録処理 |
| `src/+page.svelte` | フロントエンド | 公開(ビルド後) | ルートSvelteコンポーネント（Svelte 5 Runesを使用） |
| `src/lib/api.ts` | フロントエンド | 公開(ビルド後) | フロントエンド用API呼び出しラッパー (`fetch('./api/*.ts')`) |
| `api/*.ts` | バックエンド | 実行のみ | 役割ごとに分割されたAPIハンドラ群（ビルド時に `dist/api/` へコピー） |
| `_db/schema.ts` | バックエンド | 非公開 (403) | Drizzle ORM (SQLite) のテーブル定義 |
| `_db/index.ts` | バックエンド | 非公開 (403) | `_data/db.sqlite` への接続・初期化処理 |
| `_data/db.sqlite` | データ領域 | 非公開 (403) | SQLiteデータベースファイル（`.gitignore` 対象・デプロイ時も保護） |
| `_data/uploads/` | データ領域 | 非公開 (403) | 非公開アップロードファイル領域（バックエンド経由でのみ読み書き・配信） |
| `_data/public/` | データ領域 | **公開** | フロントエンドから `./_data/public/...` で直接参照可能な公開データ領域 |

---

## 3. 開発時の鉄則（必ず守ること）

### 鉄則1：すべてのURL・パス指定は「相対パス (`./`)」を使うこと
このテンプレートで作成されたアプリは、サーバールート (`/`) だけでなく**サブディレクトリ（例: `/tools/my-tool/`）にもデプロイされます**。
- **NG**: `fetch('/api/get-items.ts')`, `<img src="/_data/public/foo.png">`, `<a href="/about">`
- **OK**: `fetch('./api/get-items.ts')`, `<img src="./_data/public/foo.png">`, `<a href="./about">`
- Viteの `base: './'` 設定と合わせて、どこに配置されても動作するように必ず `./` 始まりの相対パスを使用してください。

### 鉄則2：`api/` 配下には役割ごとに `.ts` ファイルを作成し、`Context` ハンドラを `export default` すること
`api/` ディレクトリの中に機能・役割ごとの `.ts` ファイルを作成します。`new Hono()` のインスタンスをエクスポートするのではなく、`Context` を受け取って `c.json(...)`（または `c.html(...)`）を返す関数を `export default` してください。

```ts
// api/get-items.ts
import type { Context } from 'hono';
import { desc } from 'drizzle-orm';
import { db } from '../_db';
import { items } from '../_db/schema';

export default async (c: Context) => {
	const rows = await db.select().from(items).orderBy(desc(items.id));
	return c.json({ items: rows });
};
```

### 鉄則3：サーバー側のファイルパス解決には `import.meta.dirname` を使うこと
本番サーバーでは複数のツールがサブディレクトリで動くため、`process.cwd()` がこのプロジェクトのルートを指しているとは限りません。
- **NG**: `path.resolve(process.cwd(), '_data/db.sqlite')`
- **OK**: `_db/index.ts` で定義されている `DATA_DIR`, `PUBLIC_DATA_DIR`, `UPLOADS_DATA_DIR`（`import.meta.dirname` 基準）を使用する。

### 鉄則4：フロントエンドからサーバーコードを直接値インポートしないこと
- `src/` 配下のファイルから `_db/` や `better-sqlite3`、`api/*.ts` の実体（値）をインポートしてはいけません（ブラウザバンドルが壊れます）。
- 型共有には必ず `import type { Item } from '../../_db/schema'` のように `import type` を使用してください。

### 鉄則5：ファイルの保存先の使い分け
- **フロントエンドから `<img>` 等で直接表示したい画像・ファイル**:
  - サーバー側で `PUBLIC_DATA_DIR` (`_data/public/`) に保存し、DBには `'./_data/public/<ファイル名>'` を保存してください。
- **直接URLを知られてもアクセスさせたくないファイル・内部データ**:
  - サーバー側で `UPLOADS_DATA_DIR` (`_data/uploads/`) に保存し、`api/*.ts` のエンドポイント内で権限等を確認してから配信・処理してください。

### 鉄則6：モバイルWebアプリ（PWA）設定の維持とアプリ名の更新
作成するツールの名称が決まったら、以下の箇所のアプリ名・テーマカラーをツールに合わせて更新してください：
- `index.html` の `<title>` および `<meta name="apple-mobile-web-app-title" content="...">`
- `public/manifest.webmanifest` の `"name"`, `"short_name"`, `"description"`
- **注意**: サブディレクトリ配置に対応するため、`public/manifest.webmanifest` 内の `"start_url": "./"`, `"scope": "./"`, およびアイコンの `"src": "./icon-*.png"` の**相対パス指定は絶対に変更しないでください**。
