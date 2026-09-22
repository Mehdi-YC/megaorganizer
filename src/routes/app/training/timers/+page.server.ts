import { getTimerTemplates } from '$lib/server/services/timer.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { templates: [] };
	return { templates: await getTimerTemplates(locals.user.id) };
};
