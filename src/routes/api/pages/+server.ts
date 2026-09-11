import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPage, getPageById, updatePage, deletePage } from '$lib/server/services/page.service';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isString, isNonEmptyString } from '$lib/server/validate';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const pageId = event.url.searchParams.get('id');
	if (!pageId) return json({ error: 'Page ID required' }, { status: 400 });

	const page = await getPageById(user.id, pageId);
	if (!page) return json({ error: 'Page not found' }, { status: 404 });

	return json(page);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		categoryId: { validate: isNonEmptyString, label: 'Category ID' },
		name: { validate: isNonEmptyString, label: 'Name' },
		description: { validate: isString, required: false },
		markdown: { validate: isString, required: false },
		icon: { validate: isString, required: false },
		iconColor: { validate: isString, required: false },
		accentColor: { validate: isString, required: false },
		backgroundColor: { validate: isString, required: false },
		imageUrl: { validate: isString, required: false },
		coverImageUrl: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const { categoryId, ...data } = v.data;
	const page = await createPage(user.id, categoryId, data as any);
	return json(page, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' },
		name: { validate: isString, required: false },
		description: { validate: isString, required: false },
		markdown: { validate: isString, required: false },
		icon: { validate: isString, required: false },
		iconColor: { validate: isString, required: false },
		accentColor: { validate: isString, required: false },
		backgroundColor: { validate: isString, required: false },
		imageUrl: { validate: isString, required: false },
		coverImageUrl: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const { id, ...data } = v.data;
	const page = await updatePage(user.id, id as string, data);
	return json(page);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' }
	});
	if (!v.ok) return v.error;

	await deletePage(user.id, v.data.id);
	return json({ success: true });
};
