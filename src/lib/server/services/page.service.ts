import { db } from '$lib/server/db';
import { page, category } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import {
	rebuildDocLinks,
	rebindDanglingLinks,
	unlinkDeletedTarget,
	deleteSourceLinks
} from './wikilink.service';

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
	// Verify category belongs to this user
	const cat = await db
		.select({ id: category.id })
		.from(category)
		.where(and(eq(category.id, categoryId), eq(category.userId, userId)))
		.get();
	if (!cat) return null;

	const maxPosition = await db
		.select({ position: page.position })
		.from(page)
		.where(and(eq(page.categoryId, categoryId), eq(page.userId, userId)))
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

	await rebuildDocLinks(userId, 'page', result.id, data.markdown);
	await rebindDanglingLinks(userId, result.name, 'page', result.id);

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

	if (result) {
		if (data.markdown !== undefined) {
			await rebuildDocLinks(userId, 'page', pageId, data.markdown);
		}
		if (data.name !== undefined) {
			await rebindDanglingLinks(userId, result.name, 'page', pageId);
		}
	}

	return result;
}

export async function deletePage(userId: string, pageId: string) {
	await db.delete(page).where(and(eq(page.id, pageId), eq(page.userId, userId)));
	await deleteSourceLinks(userId, 'page', pageId);
	await unlinkDeletedTarget('page', pageId);
}
