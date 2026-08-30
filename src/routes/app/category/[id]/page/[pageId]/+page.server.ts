import type { PageServerLoad } from './$types';
import { getCategoryById } from '$lib/server/services/category.service';
import { getPageById } from '$lib/server/services/page.service';
import { getChildren } from '$lib/server/services/tree.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const category = await getCategoryById(locals.user.id, params.id);
	if (!category) {
		return { category: null, pageData: null, treeElements: [] };
	}

	const pageData = await getPageById(locals.user.id, params.pageId);
	if (!pageData) {
		return { category, pageData: null, treeElements: [] };
	}

	const treeElements = await getChildren('page', pageData.id);
	return { category, pageData, treeElements };
};
