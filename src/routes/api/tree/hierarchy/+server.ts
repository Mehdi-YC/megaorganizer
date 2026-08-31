import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFullTree } from '$lib/server/services/tree.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const tree = await getFullTree(locals.user.id);
	return json(tree);
};
