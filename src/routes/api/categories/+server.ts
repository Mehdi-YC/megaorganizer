import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createCategory,
	getCategories,
	updateCategory,
	deleteCategory
} from '$lib/server/services/category.service';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isString, isNonEmptyString } from '$lib/server/validate';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json(await getCategories(user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		name: { validate: isNonEmptyString, label: 'Name' },
		description: { validate: isString, required: false },
		icon: { validate: isString, required: false },
		iconColor: { validate: isString, required: false },
		accentColor: { validate: isString, required: false },
		backgroundColor: { validate: isString, required: false },
		imageUrl: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const category = await createCategory(user.id, v.data as any);
	return json(category, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' },
		name: { validate: isString, required: false },
		description: { validate: isString, required: false },
		icon: { validate: isString, required: false },
		iconColor: { validate: isString, required: false },
		accentColor: { validate: isString, required: false },
		backgroundColor: { validate: isString, required: false },
		imageUrl: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const { id, ...data } = v.data;
	const category = await updateCategory(user.id, id as string, data);
	if (!category) return json({ error: 'Not found' }, { status: 404 });
	return json(category);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' }
	});
	if (!v.ok) return v.error;

	await deleteCategory(user.id, v.data.id);
	return json({ success: true });
};
