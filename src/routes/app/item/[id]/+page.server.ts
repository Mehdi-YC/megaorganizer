import type { PageServerLoad } from './$types';
import { getTreeElementById, getChildren } from '$lib/server/services/tree.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const item = await getTreeElementById(locals.user.id, params.id);
	if (!item) {
		return { item: null, children: [] };
	}

	const children = await getChildren(locals.user.id, item.type as 'node' | 'item', item.id);
	return { item, children };
};
