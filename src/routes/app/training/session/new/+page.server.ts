import type { PageServerLoad } from './$types';
import { searchTreeElements } from '$lib/server/services/tree.service';
import { getProgramBlockForSession } from '$lib/server/services/program.service';
import { listExercises, getPersonalRecords } from '$lib/server/services/exercise.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const items = await searchTreeElements(locals.user.id, '');
	const blockId = url.searchParams.get('block');
	// ?block= prefills the form from a program block ("Start session").
	const programBlock = blockId ? await getProgramBlockForSession(locals.user.id, blockId) : null;

	// The library picker: exercises with their PRs for "last time" context.
	const exercises = await listExercises(locals.user.id);
	const prs = await getPersonalRecords(
		locals.user.id,
		exercises.map((e) => e.id)
	);

	return {
		items,
		programBlock,
		exercises: exercises.map((e) => ({ ...e, pr: prs.get(e.id) ?? null }))
	};
};
