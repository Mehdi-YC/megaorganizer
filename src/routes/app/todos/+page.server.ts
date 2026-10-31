import { getTodos } from '$lib/server/services/todo.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { todos: [] };
	}
	const todos = await getTodos(locals.user.id);
	return { todos };
};
