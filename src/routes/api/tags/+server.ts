import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTagsByUser, createTag, updateTag, deleteTag } from '$lib/server/services/tag.service';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isString, isNonEmptyString } from '$lib/server/validate';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json(await getTagsByUser(user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		name: { validate: isNonEmptyString, label: 'Name' },
		color: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const tag = await createTag(user.id, v.data.name, (v.data as any).color);
	return json(tag, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' },
		name: { validate: isString, required: false },
		color: { validate: isString, required: false }
	});
	if (!v.ok) return v.error;

	const { id, ...data } = v.data;
	const updated = await updateTag(user.id, id as string, data);
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' }
	});
	if (!v.ok) return v.error;

	await deleteTag(user.id, v.data.id);
	return json({ success: true });
};
