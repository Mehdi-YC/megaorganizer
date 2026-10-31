import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isNonEmptyString, isString } from '$lib/server/validate';
import {
	getTodos,
	getTodosForDate,
	createTodo,
	updateTodo,
	toggleTodo,
	deleteTodo
} from '$lib/server/services/todo.service';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const url = event.url;
	const date = url.searchParams.get('date');
	const completedParam = url.searchParams.get('completed');

	if (date) {
		const todos = await getTodosForDate(user.id, date);
		return json({ todos });
	}

	const options: { completed?: boolean; dueDate?: string | null } = {};
	if (completedParam !== null) {
		options.completed = completedParam === 'true';
	}
	if (url.searchParams.has('noDate')) {
		options.dueDate = null;
	}

	const todos = await getTodos(user.id, options);
	return json({ todos });
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);

	// Support action pattern if provided, or direct creation
	if (body && typeof body === 'object' && 'action' in body) {
		switch (body.action) {
			case 'toggle': {
				const v = validateBody(body, {
					id: { validate: isNonEmptyString, label: 'Todo ID' }
				});
				if (!v.ok) return v.error;
				const updated = await toggleTodo(user.id, v.data.id);
				if (!updated) return json({ error: 'Todo not found' }, { status: 404 });
				return json({ todo: updated });
			}

			case 'delete': {
				const v = validateBody(body, {
					id: { validate: isNonEmptyString, label: 'Todo ID' }
				});
				if (!v.ok) return v.error;
				const success = await deleteTodo(user.id, v.data.id);
				return json({ success });
			}
		}
	}

	// Create new todo
	const v = validateBody(body, {
		title: { validate: isNonEmptyString, label: 'Title' },
		dueDate: { validate: isString, label: 'Due Date', required: false },
		dueTime: { validate: isString, label: 'Due Time', required: false },
		priority: { validate: isString, label: 'Priority', required: false }
	});
	if (!v.ok) return v.error;

	const priorityVal = v.data.priority;
	const validPriority = priorityVal === 'low' || priorityVal === 'high' ? priorityVal : 'medium';

	const todo = await createTodo(user.id, {
		title: v.data.title,
		dueDate: v.data.dueDate || null,
		dueTime: v.data.dueTime || null,
		priority: validPriority
	});

	return json({ todo }, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);

	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'Todo ID' }
	});
	if (!v.ok) return v.error;

	const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const dueDate = typeof b.dueDate === 'string' || b.dueDate === null ? b.dueDate : undefined;
	const dueTime = typeof b.dueTime === 'string' || b.dueTime === null ? b.dueTime : undefined;
	const priority =
		b.priority === 'low' || b.priority === 'medium' || b.priority === 'high'
			? b.priority
			: undefined;

	const updated = await updateTodo(user.id, v.data.id, {
		title: typeof b.title === 'string' ? b.title : undefined,
		completed: typeof b.completed === 'boolean' ? b.completed : undefined,
		dueDate,
		dueTime,
		priority,
		position: typeof b.position === 'number' ? b.position : undefined
	});

	if (!updated) return json({ error: 'Todo not found' }, { status: 404 });
	return json({ todo: updated });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const id = event.url.searchParams.get('id');
	if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

	const success = await deleteTodo(user.id, id);
	return json({ success });
};
