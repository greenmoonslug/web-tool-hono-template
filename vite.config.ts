import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import devServer from '@hono/vite-dev-server';
import { getRequestListener } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { createServer, type ViteDevServer, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const ROOT_DIR = import.meta.dirname;

const IGNORED_ROOT_TS_FILES = new Set([
	'vite.config.ts',
	'playwright.config.ts',
	'vitest.config.ts',
	'drizzle.config.ts'
]);

const FRONTEND_OR_INTERNAL_DIRS = new Set(['src', 'node_modules', 'dist', 'assets', 'public', 'data']);

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.pdf': 'application/pdf'
};

function isBackendTsFileName(fileName: string, isRootFile: boolean): boolean {
	if (!fileName.endsWith('.ts') || fileName.endsWith('.d.ts')) return false;
	if (fileName.endsWith('.spec.ts') || fileName.endsWith('.test.ts') || fileName.endsWith('.e2e.ts')) {
		return false;
	}
	if (fileName.startsWith('_') || fileName.startsWith('.')) return false;
	if (isRootFile && IGNORED_ROOT_TS_FILES.has(fileName)) return false;
	return true;
}

/**
 * リクエストURLのパスから実行対象のバックエンド .ts ファイルの絶対パスを解決する
 * 例: `/api/get-items.ts` (または `/api/get-items`) -> `<baseDir>/api/get-items.ts`
 */
function resolveBackendScriptPath(pathname: string, baseDir: string): string | null {
	const segments = pathname.split('/').filter(Boolean);
	if (segments.length === 0) return null;

	// フロントエンド・データ領域ディレクトリや隠し・アンダースコア要素は除外
	if (FRONTEND_OR_INTERNAL_DIRS.has(segments[0])) return null;
	if (segments.some((seg) => seg.startsWith('_') || seg.startsWith('.'))) return null;

	const relPath = segments.join('/');
	const candidateRel = relPath.endsWith('.ts') ? relPath : `${relPath}.ts`;
	const fileName = path.basename(candidateRel);
	const isRootFile = segments.length === 1;

	if (!isBackendTsFileName(fileName, isRootFile)) return null;

	const fullPath = path.resolve(baseDir, candidateRel);
	if (!fullPath.startsWith(baseDir + path.sep)) return null;
	if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;

	return fullPath;
}

/**
 * 本番Honoサーバーの仕様をエミュレートするHonoアプリケーションを生成する
 * - アンダースコア（`_`）で始まるファイル・ディレクトリ（`_db/`, `data/_db.sqlite`, `data/_uploads/` 等）はすべて例外なく 403 Forbidden
 * - `data/` 配下の非アンダースコアファイル（`data/public/*` 等）は静的ファイルとして配信
 * - `api/*.ts` 等のTypeScriptファイルへのリクエストをPHPのように動的importして `export default (c: Context) => ...` を実行
 */
export function createEmulatorApp(
	loadTsModule: (filePath: string) => Promise<Record<string, unknown>>,
	baseDir: string = ROOT_DIR
) {
	const app = new Hono();

	// 1. アンダースコアで始まるすべてのディレクトリ・ファイル（_db, data/_db.sqlite, data/_uploads 等）へのアクセスを例外なく遮断
	app.all('*', async (c, next) => {
		const url = new URL(c.req.url);
		const segments = url.pathname.split('/').filter(Boolean);
		if (segments.some((seg) => seg.startsWith('_'))) {
			return c.text('Forbidden: Underscore-prefixed files and directories are private', 403);
		}
		await next();
	});

	// 2. data/* 配下の公開ファイル（data/public/* など、アンダースコアを含まないパス）の静的ファイル配信
	app.on(['GET', 'HEAD'], '/data/*', (c) => {
		const url = new URL(c.req.url);
		const relPath = decodeURIComponent(url.pathname.replace(/^\/data\//, ''));
		const dataRoot = path.resolve(ROOT_DIR, 'data');
		const targetPath = path.resolve(dataRoot, relPath);

		if (!targetPath.startsWith(dataRoot + path.sep) && targetPath !== dataRoot) {
			return c.text('Forbidden', 403);
		}
		if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
			return c.text('Not Found', 404);
		}

		const ext = path.extname(targetPath).toLowerCase();
		const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
		const content = fs.readFileSync(targetPath);
		return new Response(content, {
			status: 200,
			headers: { 'Content-Type': contentType }
		});
	});

	// 3. Apache/PHPライクなファイルベースTypeScript実行 (/api/get-items.ts など)
	app.all('*', async (c) => {
		const url = new URL(c.req.url);
		const scriptFullPath = resolveBackendScriptPath(url.pathname, baseDir);
		if (!scriptFullPath) {
			return c.notFound();
		}

		const mod = await loadTsModule(scriptFullPath);
		const exported = mod.default;

		// ハンドラ関数が default export されている場合: export default async (c: Context) => c.json(...)
		if (typeof exported === 'function') {
			return await (exported as (ctx: Context) => Response | Promise<Response>)(c);
		}

		return c.text(`Invalid default export in ${path.relative(baseDir, scriptFullPath)}`, 500);
	});

	return app;
}

/**
 * ビルド時にバックエンド用ファイル (api/, _db/) を dist/ に出力し、
 * vite preview 時にも本番同様のルーティングを再現するプラグイン
 */
function honoBackendBuildAndPreviewPlugin(): Plugin {
	return {
		name: 'hono-backend-build-and-preview',
		closeBundle() {
			const distDir = path.resolve(ROOT_DIR, 'dist');
			if (!fs.existsSync(distDir)) return;

			// 1. api ディレクトリを dist/api にコピー
			const apiSrcDir = path.resolve(ROOT_DIR, 'api');
			const apiDestDir = path.resolve(distDir, 'api');
			if (fs.existsSync(apiSrcDir)) {
				fs.cpSync(apiSrcDir, apiDestDir, { recursive: true });
			}

			// 2. _db ディレクトリを dist/_db にコピー
			const dbSrcDir = path.resolve(ROOT_DIR, '_db');
			const dbDestDir = path.resolve(distDir, '_db');
			if (fs.existsSync(dbSrcDir)) {
				fs.cpSync(dbSrcDir, dbDestDir, { recursive: true });
			}

			// 3. ルート直下にバックエンド用 .ts ファイルがあれば dist/ にコピー
			for (const entry of fs.readdirSync(ROOT_DIR, { withFileTypes: true })) {
				if (entry.isFile() && isBackendTsFileName(entry.name, true)) {
					fs.copyFileSync(
						path.resolve(ROOT_DIR, entry.name),
						path.resolve(distDir, entry.name)
					);
				}
			}
		},
		async configurePreviewServer(previewServer) {
			const ssrVite: ViteDevServer = await createServer({
				root: ROOT_DIR,
				server: { middlewareMode: true },
				appType: 'custom'
			});
			previewServer.httpServer?.on('close', () => {
				void ssrVite.close();
			});

			const distDir = path.resolve(ROOT_DIR, 'dist');
			const baseDir = fs.existsSync(distDir) ? distDir : ROOT_DIR;
			const app = createEmulatorApp((filePath) => ssrVite.ssrLoadModule(filePath), baseDir);
			const listener = getRequestListener((request) => app.fetch(request));

			previewServer.middlewares.use((req, res, next) => {
				const urlPath = req.url?.split('?')[0] ?? '/';
				const segments = urlPath.split('/').filter(Boolean);

				const isUnderscoreRequest = segments.some((s) => s.startsWith('_'));
				const isDataRequest = segments[0] === 'data';
				const isBackendScriptRequest = resolveBackendScriptPath(urlPath, baseDir) !== null;

				if (isUnderscoreRequest || isDataRequest || isBackendScriptRequest) {
					void listener(req, res);
					return;
				}
				next();
			});
		}
	};
}

export default defineConfig({
	base: './',
	plugins: [
		tailwindcss(),
		svelte(),
		devServer({
			entry: './api/get-items.ts',
			injectClientScript: false,
			exclude: [
				/^\/$/,
				/^\/index\.html$/,
				/^\/src\/.*/,
				/^\/@.+$/,
				/^\/node_modules\/.*/,
				/^\/\.vite\/.*/,
				/^\/favicon\..+$/,
				/^(?!\/_|.*\/_|\/data\/).*\.(css|svelte|vue|jsx|tsx|mjs|js|map|png|jpg|jpeg|gif|svg|webp|ico|webmanifest)$/
			],
			loadModule: (server) => {
				const app = createEmulatorApp((filePath) => server.ssrLoadModule(filePath), ROOT_DIR);
				return Promise.resolve({
					fetch: async (req: Request, env: unknown) =>
						await app.fetch(req, env as Record<string, unknown>)
				});
			}
		}),
		honoBackendBuildAndPreviewPlugin()
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', '_db/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
