import { db } from '$lib/server/db';
import { category, page } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function createCategory(
	userId: string,
	data: {
		name: string;
		description?: string;
		icon?: string;
		iconColor?: string;
		accentColor?: string;
		backgroundColor?: string;
		imageUrl?: string;
	}
) {
	const maxPosition = await db
		.select({ position: category.position })
		.from(category)
		.where(eq(category.userId, userId))
		.orderBy(asc(category.position))
		.all();

	const position = maxPosition.length > 0 ? Math.max(...maxPosition.map((p) => p.position)) + 1 : 0;

	const [result] = await db
		.insert(category)
		.values({
			userId,
			name: data.name,
			description: data.description,
			icon: data.icon,
			iconColor: data.iconColor,
			accentColor: data.accentColor,
			backgroundColor: data.backgroundColor,
			imageUrl: data.imageUrl,
			position
		})
		.returning();

	return result;
}

export async function getCategories(userId: string) {
	return db
		.select()
		.from(category)
		.where(eq(category.userId, userId))
		.orderBy(asc(category.position))
		.all();
}

export async function getCategoryById(userId: string, categoryId: string) {
	return db
		.select()
		.from(category)
		.where(eq(category.id, categoryId))
		.get();
}

export async function updateCategory(
	userId: string,
	categoryId: string,
	data: {
		name?: string;
		description?: string;
		icon?: string;
		iconColor?: string;
		accentColor?: string;
		backgroundColor?: string;
		imageUrl?: string;
		collapsed?: boolean;
		position?: number;
	}
) {
	const [result] = await db
		.update(category)
		.set(data)
		.where(eq(category.id, categoryId))
		.returning();

	return result;
}

export async function deleteCategory(userId: string, categoryId: string) {
	await db.delete(category).where(eq(category.id, categoryId));
}

export async function getCategoryPages(userId: string, categoryId: string) {
	return db
		.select()
		.from(page)
		.where(eq(page.categoryId, categoryId))
		.orderBy(asc(page.position))
		.all();
}
