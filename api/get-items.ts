import type { Context } from 'hono';
import { desc } from 'drizzle-orm';
import { db } from '../_db';
import { items } from '../_db/schema';

/**
 * アイテム一覧を取得する (GET ./api/get-items.ts)
 */
export default async (c: Context) => {
	const rows = await db.select().from(items).orderBy(desc(items.id));
	return c.json({ items: rows });
};
