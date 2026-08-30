import type { PageServerLoad } from './$types';
import { getTrainingSessions } from '$lib/server/services/training.service';

export const load: PageServerLoad = async ({ locals }) => {
	const sessions = await getTrainingSessions(locals.user.id);
	return { sessions };
};
