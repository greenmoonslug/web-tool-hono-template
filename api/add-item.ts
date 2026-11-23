import type { Context } from 'hono';
import { db } from '../_db';
import { items } from '../_db/schema';

/**
 * 新規アイテムを追加する (POST ./api/add-item.ts)
 */
export default async (c: Context) => {
	const body = await c.req.json<{
		title?: string;
		description?: string;
		useSampleImage?: boolean;
	}>();

	const title = body.title?.trim();
	if (!title) {
		return c.json({ error: 'タイトルは必須です' }, 400);
	}

	const [inserted] = await db
		.insert(items)
		.values({
			title,
			description: body.description?.trim() ?? '',
			imagePath: body.useSampleImage !== false ? './_data/public/sample-icon.svg' : null
		})
		.returning();

	return c.json({ item: inserted }, 201);
};
