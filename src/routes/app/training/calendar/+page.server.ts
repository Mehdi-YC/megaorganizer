import { json } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTrainingSessions } from '$lib/server/services/training.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { sessions: [] };
	}

	const sessions = await getTrainingSessions(locals.user.id);
	return { sessions };
};
