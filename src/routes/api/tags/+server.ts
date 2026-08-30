import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTagsByUser, createTag, updateTag, deleteTag } from '$lib/server/services/tag.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const tags = await getTagsByUser(locals.user.id);
	return json(tags);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { name, color } = await request.json();
	if (!name?.trim()) return json({ error: 'Name required' }, { status: 400 });
	const tag = await createTag(locals.user.id, name.trim(), color);
	return json(tag, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { id, ...data } = await request.json();
	if (!id) return json({ error: 'ID required' }, { status: 400 });
	const updated = await updateTag(id, data);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { id } = await request.json();
	if (!id) return json({ error: 'ID required' }, { status: 400 });
	await deleteTag(id);
	return json({ success: true });
};
