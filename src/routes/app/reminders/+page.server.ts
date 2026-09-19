import { getReminderTemplates } from '$lib/server/services/reminder.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { templates: [] };
	}

	const templates = await getReminderTemplates(locals.user.id);

	return {
		templates
	};
};
