import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getTagsByUser(userId: string) {
	return db.select().from(tag).where(eq(tag.userId, userId)).all();
}

export async function createTag(userId: string, name: string, color?: string) {
	const [result] = await db
		.insert(tag)
		.values({ userId, name, color: color || null })
		.returning();
	return result;
}

export async function updateTag(userId: string, tagId: string, data: { name?: string; color?: string }) {
	const [result] = await db
		.update(tag)
		.set(data)
		.where(and(eq(tag.id, tagId), eq(tag.userId, userId)))
		.returning();
	return result;
}

export async function deleteTag(userId: string, tagId: string) {
	await db
		.delete(tag)
		.where(and(eq(tag.id, tagId), eq(tag.userId, userId)));
}
