import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProgram } from '$lib/server/services/program.service';
import { listExercises, getPersonalRecords } from '$lib/server/services/exercise.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const program = await getProgram(locals.user.id, params.id);
	if (!program) error(404, 'Program not found');

	// The exercise picker needs the library; PRs double-check fresh values.
	const exercises = await listExercises(locals.user.id);
	const prs = await getPersonalRecords(
		locals.user.id,
		exercises.map((e) => e.id)
	);

	return {
		program,
		exercises: exercises.map((e) => ({ ...e, pr: prs.get(e.id) ?? null }))
	};
};
