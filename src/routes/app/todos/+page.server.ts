import { getTodos } from '$lib/server/services/todo.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { todos: [] };
	}
	// Open todos are the working set; completed history is capped so the
	// page payload does not grow forever.
	const [open, completed] = await Promise.all([
		getTodos(locals.user.id, { completed: false }),
		getTodos(locals.user.id, { completed: true, limit: 200 })
	]);
	return { todos: [...open, ...completed] };
};
