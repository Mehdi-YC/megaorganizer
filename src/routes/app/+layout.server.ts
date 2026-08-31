import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { category, page } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const categories = await db
		.select()
		.from(category)
		.where(eq(category.userId, locals.user.id))
		.orderBy(asc(category.position));

	const categoriesWithPages = await Promise.all(
		categories.map(async (cat) => {
			const pages = await db
				.select({ id: page.id, name: page.name })
				.from(page)
				.where(eq(page.categoryId, cat.id))
				.orderBy(asc(page.position));
			return { ...cat, pages };
		})
	);

	return {
		categories: categoriesWithPages,
		user: {
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image
		}
	};
};
