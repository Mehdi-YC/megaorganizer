import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function createPage(
	userId: string,
	categoryId: string,
	data: {
		name: string;
		description?: string;
		markdown?: string;
		icon?: string;
		iconColor?: string;
		accentColor?: string;
		backgroundColor?: string;
		imageUrl?: string;
		coverImageUrl?: string;
	}
) {
	const maxPosition = await db
		.select({ position: page.position })
		.from(page)
		.where(eq(page.categoryId, categoryId))
		.orderBy(asc(page.position))
		.all();

	const position = maxPosition.length > 0 ? Math.max(...maxPosition.map((p) => p.position)) + 1 : 0;

	const [result] = await db
		.insert(page)
		.values({
			userId,
			categoryId,
			name: data.name,
			description: data.description,
			markdown: data.markdown,
			icon: data.icon,
			iconColor: data.iconColor,
			accentColor: data.accentColor,
			backgroundColor: data.backgroundColor,
			imageUrl: data.imageUrl,
			coverImageUrl: data.coverImageUrl,
			position
		})
		.returning();

	return result;
}

export async function getPageById(userId: string, pageId: string) {
	return db
		.select()
		.from(page)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)))
		.get();
}

export async function updatePage(
	userId: string,
	pageId: string,
	data: {
		name?: string;
		description?: string;
		markdown?: string;
		icon?: string;
		iconColor?: string;
		accentColor?: string;
		backgroundColor?: string;
		imageUrl?: string;
		coverImageUrl?: string;
		position?: number;
	}
) {
	const [result] = await db
		.update(page)
		.set(data)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)))
		.returning();

	return result;
}

export async function deletePage(userId: string, pageId: string) {
	await db
		.delete(page)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)));
}
