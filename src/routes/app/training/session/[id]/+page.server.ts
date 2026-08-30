import type { PageServerLoad } from './$types';
import { getTrainingSessionById, getTrainingActivities } from '$lib/server/services/training.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = await getTrainingSessionById(locals.user.id, params.id);
	if (!session) {
		return { session: null, activities: [] };
	}

	const activities = await getTrainingActivities(session.id);
	return { session, activities };
};
