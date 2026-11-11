import type { PageServerLoad } from './$types';
import { searchTreeElements } from '$lib/server/services/tree.service';
import { getProgramBlockForSession } from '$lib/server/services/program.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const items = await searchTreeElements(locals.user.id, '');
	const blockId = url.searchParams.get('block');
	// ?block= prefills the form from a program block ("Start session").
	const programBlock = blockId ? await getProgramBlockForSession(locals.user.id, blockId) : null;
	return { items, programBlock };
};
