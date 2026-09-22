import { getTimerTemplateById } from '$lib/server/services/timer.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(404, 'Not found');
	const template = await getTimerTemplateById(locals.user.id, params.id);
	if (!template) throw error(404, 'Not found');
	return { template };
};
