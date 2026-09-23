import type { PageServerLoad } from './$types';
import { getTreeElementById, getChildren } from '$lib/server/services/tree.service';
import { resolveDocLinks, getBacklinks } from '$lib/server/services/wikilink.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const item = await getTreeElementById(locals.user.id, params.id);
	if (!item) {
		return { item: null, children: [], links: {}, backlinks: [] };
	}

	const children = await getChildren(locals.user.id, item.type as 'node' | 'item', item.id);
	const [links, backlinks] = await Promise.all([
		resolveDocLinks(locals.user.id, 'tree_element', item.id, item.markdown),
		getBacklinks(locals.user.id, 'tree_element', item.id)
	]);
	return { item, children, links, backlinks };
};
