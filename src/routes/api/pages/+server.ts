import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPage, getPageById, updatePage, deletePage } from '$lib/server/services/page.service';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const pageId = url.searchParams.get('id');
	if (!pageId) {
		return json({ error: 'Page ID required' }, { status: 400 });
	}

	const page = await getPageById(locals.user.id, pageId);
	if (!page) {
		return json({ error: 'Page not found' }, { status: 404 });
	}

	return json(page);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();
	const page = await createPage(locals.user.id, data.categoryId, data);
	return json(page, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id, ...data } = await request.json();
	const page = await updatePage(locals.user.id, id, data);
	return json(page);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await request.json();
	await deletePage(locals.user.id, id);
	return json({ success: true });
};
