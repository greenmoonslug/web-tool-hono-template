import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../_db';
import { items } from '../_db/schema';

/**
 * 指定IDのアイテムを削除する (POSTまたはDELETE ./api/delete-item.ts)
 * JSONボディ `{ id }` またはクエリパラメータ `?id=` の両方に対応
 */
export default async (c: Context) => {
	const queryId = c.req.query('id');
	const body =
		queryId !== undefined
			? { id: queryId }
			: await c.req.json<{ id?: number | string }>().catch(() => ({ id: undefined }));
	const id = Number(body.id);

	if (!Number.isInteger(id)) {
		return c.json({ error: '不正なIDです' }, 400);
	}

	await db.delete(items).where(eq(items.id, id));
	return c.json({ ok: true });
};
