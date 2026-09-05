import { db } from '$lib/server/db';
import { category, page } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

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
		.where(and(eq(category.id, categoryId), eq(category.userId, userId)))
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
		.where(and(eq(category.id, categoryId), eq(category.userId, userId)))
		.returning();

	return result;
}

export async function deleteCategory(userId: string, categoryId: string) {
	await db
		.delete(category)
		.where(and(eq(category.id, categoryId), eq(category.userId, userId)));
}

export async function getCategoryPages(userId: string, categoryId: string) {
	return db
		.select()
		.from(page)
		.where(and(eq(page.categoryId, categoryId), eq(page.userId, userId)))
		.orderBy(asc(page.position))
		.all();
}

export async function getCategoriesWithPages(userId: string) {
	const categories = await getCategories(userId);
	return Promise.all(
		categories.map(async (cat) => {
			const pages = await db
				.select({ id: page.id, name: page.name })
				.from(page)
				.where(eq(page.categoryId, cat.id))
				.orderBy(asc(page.position));
			return { ...cat, pages };
		})
	);
}
