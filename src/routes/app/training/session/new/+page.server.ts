import type { PageServerLoad } from './$types';
import { searchTreeElements } from '$lib/server/services/tree.service';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await searchTreeElements(locals.user.id, '');
	return { items };
};
