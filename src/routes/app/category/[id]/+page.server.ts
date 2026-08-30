import type { PageServerLoad } from './$types';
import { getCategoryById, getCategoryPages } from '$lib/server/services/category.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const category = await getCategoryById(locals.user.id, params.id);
	if (!category) {
		return { category: null, pages: [] };
	}

	const pages = await getCategoryPages(locals.user.id, category.id);
	return { category, pages };
};
