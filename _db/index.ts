import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * プロジェクト内の _data ディレクトリを解決する
 * 本番環境 (www/tools/my-tool/_db) でも開発環境 (projects/my-tool/_db) でも
 * `_db` の1つ上の階層にある `_data` を参照する（process.cwd() に依存しない）
 */
function resolveDataDir(): string {
	const parentDir = path.resolve(import.meta.dirname, '..');
	// ローカルの vite preview 時に dist/_db から実行された場合はプロジェクトルートの _data を参照
	if (path.basename(parentDir) === 'dist') {
		const rootData = path.resolve(parentDir, '../_data');
		if (fs.existsSync(rootData)) {
			return rootData;
		}
	}
	return path.resolve(parentDir, '_data');
}

export const DATA_DIR = resolveDataDir();
export const PUBLIC_DATA_DIR = path.resolve(DATA_DIR, 'public');
export const UPLOADS_DATA_DIR = path.resolve(DATA_DIR, 'uploads');

// 必要なデータディレクトリを自動生成
fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DATA_DIR, { recursive: true });

// サンプル公開画像 (_data/public/sample-icon.svg) が存在しなければ初期配置
const sampleSvgPath = path.resolve(PUBLIC_DATA_DIR, 'sample-icon.svg');
if (!fs.existsSync(sampleSvgPath)) {
	fs.writeFileSync(
		sampleSvgPath,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="24" fill="#EFF6FF"/>
  <circle cx="60" cy="60" r="34" fill="#3B82F6" fill-opacity="0.15" stroke="#2563EB" stroke-width="4"/>
  <path d="M46 60L56 70L76 50" stroke="#2563EB" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`,
		'utf-8'
	);
}

const dbPath = path.resolve(DATA_DIR, 'db.sqlite');
const sqlite = new Database(dbPath);

// WALモードと外部キー制約を有効化
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// 初回起動時にサンプルテーブルを自動作成し、空なら初期データを投入
sqlite.exec(`
	CREATE TABLE IF NOT EXISTS items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		image_path TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);
`);

const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };
if (countRow.count === 0) {
	sqlite
		.prepare('INSERT INTO items (title, description, image_path) VALUES (?, ?, ?)')
		.run(
			'サンプルアイテム',
			'Svelte (静的フロントエンド) + Hono (api.ts) + Drizzle ORM (SQLite) の連携サンプルです。画像は _data/public から配信されています。',
			'./_data/public/sample-icon.svg'
		);
}

export const db = drizzle(sqlite, { schema });
