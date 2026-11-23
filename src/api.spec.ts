import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import getItemsHandler from '../api/get-items';
import addItemHandler from '../api/add-item';
import deleteItemHandler from '../api/delete-item';
import { DATA_DIR, PUBLIC_DATA_DIR } from '../_db';
import { createEmulatorApp } from '../vite.config';

const handlerMap: Record<string, unknown> = {
	[path.resolve(import.meta.dirname, '../api/get-items.ts')]: getItemsHandler,
	[path.resolve(import.meta.dirname, '../api/add-item.ts')]: addItemHandler,
	[path.resolve(import.meta.dirname, '../api/delete-item.ts')]: deleteItemHandler
};

describe('Hono File-Based API (api/*.ts) & SQLite Database (_db)', () => {
	const emulator = createEmulatorApp(async (filePath) => ({
		default: handlerMap[filePath]
	}));

	it('initializes _data directory and sample public asset', () => {
		expect(fs.existsSync(path.resolve(DATA_DIR, 'db.sqlite'))).toBe(true);
		expect(fs.existsSync(path.resolve(PUBLIC_DATA_DIR, 'sample-icon.svg'))).toBe(true);
	});

	it('executes api/add-item.ts, api/get-items.ts, and api/delete-item.ts via Context handlers', async () => {
		// 1. POST /api/add-item.ts
		const createRes = await emulator.request('/api/add-item.ts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: 'Vitest テストアイテム',
				description: '役割別ファイル分割のテスト',
				useSampleImage: true
			})
		});
		expect(createRes.status).toBe(201);
		const created = (await createRes.json()) as {
			item: { id: number; title: string; imagePath: string | null };
		};
		expect(created.item.title).toBe('Vitest テストアイテム');
		expect(created.item.imagePath).toBe('./_data/public/sample-icon.svg');

		// 2. GET /api/get-items.ts
		const listRes = await emulator.request('/api/get-items.ts');
		expect(listRes.status).toBe(200);
		const listData = (await listRes.json()) as { items: Array<{ id: number; title: string }> };
		expect(listData.items.some((i) => i.id === created.item.id)).toBe(true);

		// 3. POST /api/delete-item.ts
		const delRes = await emulator.request('/api/delete-item.ts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: created.item.id })
		});
		expect(delRes.status).toBe(200);
	});

	it('enforces underscore directory protection while exposing _data/public', async () => {
		// _data/public/* is publicly served
		const publicRes = await emulator.request('/_data/public/sample-icon.svg');
		expect(publicRes.status).toBe(200);
		expect(publicRes.headers.get('content-type')).toContain('image/svg+xml');

		// Other _ directories (_db, _data/db.sqlite, _data/uploads) are blocked (403)
		const dbFileRes = await emulator.request('/_data/db.sqlite');
		expect(dbFileRes.status).toBe(403);

		const uploadsRes = await emulator.request('/_data/uploads/secret.txt');
		expect(uploadsRes.status).toBe(403);

		const dbCodeRes = await emulator.request('/_db/schema.ts');
		expect(dbCodeRes.status).toBe(403);
	});
});
