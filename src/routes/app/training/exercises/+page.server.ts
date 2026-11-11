import type { PageServerLoad } from './$types';
import { listExercises, getPersonalRecords } from '$lib/server/services/exercise.service';

export const load: PageServerLoad = async ({ locals }) => {
	const exercises = await listExercises(locals.user.id);
	const prs = await getPersonalRecords(
		locals.user.id,
		exercises.map((e) => e.id)
	);
	return {
		exercises: exercises.map((e) => ({ ...e, pr: prs.get(e.id) ?? null }))
	};
};
