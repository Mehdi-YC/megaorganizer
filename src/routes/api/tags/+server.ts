import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTagsByUser, createTag, updateTag, deleteTag } from '$lib/server/services/tag.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const tags = await getTagsByUser(user.id);
	return json(tags);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { name, color } = await event.request.json();
	if (!name?.trim()) return json({ error: 'Name required' }, { status: 400 });
	const tag = await createTag(user.id, name.trim(), color);
	return json(tag, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id, ...data } = await event.request.json();
	if (!id) return json({ error: 'ID required' }, { status: 400 });
	const updated = await updateTag(user.id, id, data);
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { id } = await event.request.json();
	if (!id) return json({ error: 'ID required' }, { status: 400 });
	await deleteTag(user.id, id);
	return json({ success: true });
};
