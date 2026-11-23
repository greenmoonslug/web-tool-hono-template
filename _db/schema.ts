import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * サンプルテーブル: items
 * - imagePath には `_data/public/` 配下の公開ファイルへの相対パス（例: `./_data/public/sample-icon.svg`）を格納可能
 */
export const items = sqliteTable('items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	imagePath: text('image_path'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
