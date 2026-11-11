import type { PageServerLoad } from './$types';
import {
	getTrainingSessionById,
	getTrainingActivities,
	getExerciseRecordsBySession
} from '$lib/server/services/training.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = await getTrainingSessionById(locals.user.id, params.id);
	if (!session) {
		return { session: null, activities: [], records: [] };
	}

	const [activities, records] = await Promise.all([
		getTrainingActivities(locals.user.id, session.id),
		getExerciseRecordsBySession(locals.user.id, session.id)
	]);
	return { session, activities, records };
};
