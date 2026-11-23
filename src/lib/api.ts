// src/lib/api.ts（ブラウザ側で実行されるAPIクライアント）
// import type を用いることで、サーバー側のDB処理コードをフロントエンドバンドルに含めず型定義のみを共有する
import type { Item } from '../../_db/schema';

export type { Item };

// サブディレクトリへのデプロイにも対応するため、必ず相対パス ('./api/*.ts') を指定する
export const api = {
	async getItems(): Promise<{ items: Item[] }> {
		const res = await fetch('./api/get-items.ts');
		if (!res.ok) {
			throw new Error(`データの取得に失敗しました (${res.status})`);
		}
		return (await res.json()) as { items: Item[] };
	},

	async addItem(input: {
		title: string;
		description?: string;
		useSampleImage?: boolean;
	}): Promise<{ item: Item }> {
		const res = await fetch('./api/add-item.ts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { error?: string };
			throw new Error(err.error ?? `登録に失敗しました (${res.status})`);
		}
		return (await res.json()) as { item: Item };
	},

	async deleteItem(id: number): Promise<{ ok: boolean }> {
		const res = await fetch('./api/delete-item.ts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { error?: string };
			throw new Error(err.error ?? `削除に失敗しました (${res.status})`);
		}
		return (await res.json()) as { ok: boolean };
	}
};
