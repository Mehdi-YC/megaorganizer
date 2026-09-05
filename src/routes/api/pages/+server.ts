import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPage, getPageById, updatePage, deletePage } from '$lib/server/services/page.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const pageId = event.url.searchParams.get('id');
	if (!pageId) {
		return json({ error: 'Page ID required' }, { status: 400 });
	}

	const page = await getPageById(user.id, pageId);
	if (!page) {
		return json({ error: 'Page not found' }, { status: 404 });
	}

	return json(page);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (!data.categoryId) {
		return json({ error: 'Category ID is required' }, { status: 400 });
	}
	if (!data.name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const page = await createPage(user.id, data.categoryId, {
		name: data.name.trim(),
		description: data.description,
		markdown: data.markdown,
		icon: data.icon,
		iconColor: data.iconColor,
		accentColor: data.accentColor,
		backgroundColor: data.backgroundColor,
		imageUrl: data.imageUrl,
		coverImageUrl: data.coverImageUrl
	});
	return json(page, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id, ...data } = await event.request.json();

	if (!id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}

	const page = await updatePage(user.id, id, data);
	return json(page);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}

	await deletePage(user.id, id);
	return json({ success: true });
};
