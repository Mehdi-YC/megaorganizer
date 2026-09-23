import type { PageServerLoad } from './$types';
import { getCategoryById } from '$lib/server/services/category.service';
import { getPageById } from '$lib/server/services/page.service';
import { getChildren } from '$lib/server/services/tree.service';
import { getAttachmentsByPage } from '$lib/server/services/attachment.service';
import { resolveDocLinks, getBacklinks } from '$lib/server/services/wikilink.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const category = await getCategoryById(locals.user.id, params.id);
	if (!category) {
		return {
			category: null,
			pageData: null,
			treeElements: [],
			attachments: [],
			links: {},
			backlinks: []
		};
	}

	const pageData = await getPageById(locals.user.id, params.pageId);
	if (!pageData) {
		return {
			category,
			pageData: null,
			treeElements: [],
			attachments: [],
			links: {},
			backlinks: []
		};
	}

	const treeElements = await getChildren(locals.user.id, 'page', pageData.id);

	let attachments: Awaited<ReturnType<typeof getAttachmentsByPage>> = [];
	try {
		attachments = await getAttachmentsByPage(locals.user.id, pageData.id);
	} catch {
		// attachment table may not exist yet
	}

	const [links, backlinks] = await Promise.all([
		resolveDocLinks(locals.user.id, 'page', pageData.id, pageData.markdown),
		getBacklinks(locals.user.id, 'page', pageData.id)
	]);

	return { category, pageData, treeElements, attachments, links, backlinks };
};
