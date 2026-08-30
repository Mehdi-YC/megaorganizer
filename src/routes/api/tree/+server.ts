import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createTreeElement,
	getTreeElementById,
	updateTreeElement,
	deleteTreeElement,
	getChildren,
	addChildToParent,
	removeChildFromParent,
	moveChild,
	searchTreeElements
} from '$lib/server/services/tree.service';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	const parentType = url.searchParams.get('parentType') as 'page' | 'node' | 'item' | null;
	const parentId = url.searchParams.get('parentId');
	const search = url.searchParams.get('search');

	if (search) {
		const results = await searchTreeElements(locals.user.id, search);
		return json(results);
	}

	if (id) {
		const element = await getTreeElementById(id);
		if (!element) {
			return json({ error: 'Not found' }, { status: 404 });
		}
		return json(element);
	}

	if (parentType && parentId) {
		const children = await getChildren(parentType, parentId);
		return json(children);
	}

	// No params = return all user's tree elements (for library)
	const all = await searchTreeElements(locals.user.id, '');
	return json(all);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'create') {
		const element = await createTreeElement(locals.user.id, data.type, data);
		return json(element, { status: 201 });
	}

	if (data.action === 'addChild') {
		const result = await addChildToParent(
			data.parentType,
			data.parentId,
			data.childType,
			data.childId
		);
		return json(result, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'move') {
		await moveChild(data.parentType, data.parentId, data.childId, data.position);
		return json({ success: true });
	}

	const { id, ...updateData } = data;
	const element = await updateTreeElement(id, updateData);
	return json(element);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'removeChild') {
		await removeChildFromParent(data.parentType, data.parentId, data.childId);
		return json({ success: true });
	}

	await deleteTreeElement(data.id);
	return json({ success: true });
};
