import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getTagsByUser(userId: string) {
	return db.select().from(tag).where(eq(tag.userId, userId)).all();
}

export async function getTagById(id: string) {
	return db.select().from(tag).where(eq(tag.id, id)).get();
}

export async function createTag(userId: string, name: string, color?: string) {
	const [result] = await db
		.insert(tag)
		.values({ userId, name, color: color || null })
		.returning();
	return result;
}

export async function updateTag(id: string, data: { name?: string; color?: string }) {
	const [result] = await db.update(tag).set(data).where(eq(tag.id, id)).returning();
	return result;
}

export async function deleteTag(id: string) {
	await db.delete(tag).where(eq(tag.id, id));
}

export async function getTagsByIds(ids: string[]) {
	if (ids.length === 0) return [];
	const { inArray } = await import('drizzle-orm');
	return db.select().from(tag).where(inArray(tag.id, ids)).all();
}
