import type { PageServerLoad } from './$types';
import { getPrograms } from '$lib/server/services/program.service';

export const load: PageServerLoad = async ({ locals }) => {
	return { programs: await getPrograms(locals.user.id) };
};
