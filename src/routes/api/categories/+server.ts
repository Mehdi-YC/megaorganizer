import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCategory, getCategories, updateCategory, deleteCategory } from '$lib/server/services/category.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const categories = await getCategories(locals.user.id);
	return json(categories);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();
	const category = await createCategory(locals.user.id, data);
	return json(category, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id, ...data } = await request.json();
	const category = await updateCategory(locals.user.id, id, data);
	return json(category);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await request.json();
	await deleteCategory(locals.user.id, id);
	return json({ success: true });
};
