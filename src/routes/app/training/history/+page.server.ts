import type { PageServerLoad } from './$types';
import { getTrainingSessionsWithActivities } from '$lib/server/services/training.service';

export const load: PageServerLoad = async ({ locals }) => {
	const sessions = await getTrainingSessionsWithActivities(locals.user.id);
	return { sessions };
};
