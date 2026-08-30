import type { PageServerLoad } from './$types';
import { getTreeElementById, getChildren } from '$lib/server/services/tree.service';

export const load: PageServerLoad = async ({ params }) => {
	const item = await getTreeElementById(params.id);
	if (!item) {
		return { item: null, children: [] };
	}

	const children = await getChildren(item.type as 'node' | 'item', item.id);
	return { item, children };
};
