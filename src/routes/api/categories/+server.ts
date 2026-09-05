import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCategory, getCategories, updateCategory, deleteCategory } from '$lib/server/services/category.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const categories = await getCategories(user.id);
	return json(categories);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (!data.name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const category = await createCategory(user.id, {
		name: data.name.trim(),
		description: data.description,
		icon: data.icon,
		iconColor: data.iconColor,
		accentColor: data.accentColor,
		backgroundColor: data.backgroundColor,
		imageUrl: data.imageUrl
	});
	return json(category, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id, ...data } = await event.request.json();

	if (!id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}

	const category = await updateCategory(user.id, id, data);
	return json(category);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}

	await deleteCategory(user.id, id);
	return json({ success: true });
};
