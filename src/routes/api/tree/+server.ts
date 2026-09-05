import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createTreeElement,
	getTreeElementById,
	updateTreeElement,
	deleteTreeElement,
	getChildren,
	getSubtreeForItem,
	addChildToParent,
	removeChildFromParent,
	moveChild,
	searchTreeElements
} from '$lib/server/services/tree.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);

	const id = event.url.searchParams.get('id');
	const parentType = event.url.searchParams.get('parentType') as 'page' | 'node' | 'item' | null;
	const parentId = event.url.searchParams.get('parentId');
	const search = event.url.searchParams.get('search');

	if (search) {
		const results = await searchTreeElements(user.id, search);
		return json(results);
	}

	if (id) {
		const element = await getTreeElementById(user.id, id);
		if (!element) {
			return json({ error: 'Not found' }, { status: 404 });
		}
		return json(element);
	}

	if (parentType && parentId) {
		const children = await getChildren(user.id, parentType, parentId);
		return json(children);
	}

	const subtreeId = event.url.searchParams.get('subtree');
	if (subtreeId) {
		const subtree = await getSubtreeForItem(user.id, subtreeId);
		return json(subtree ? [subtree] : []);
	}

	const all = await searchTreeElements(user.id, '');
	return json(all);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'create') {
		if (!data.type || !['node', 'item'].includes(data.type)) {
			return json({ error: 'Valid type required (node|item)' }, { status: 400 });
		}
		if (!data.name?.trim()) {
			return json({ error: 'Name is required' }, { status: 400 });
		}
		const element = await createTreeElement(user.id, data.type, data);
		return json(element, { status: 201 });
	}

	if (data.action === 'addChild') {
		if (!data.parentType || !data.parentId || !data.childType || !data.childId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
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

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'move') {
		if (!data.parentType || !data.parentId || !data.childId || data.position === undefined) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		await moveChild(data.parentType, data.parentId, data.childId, data.position);
		return json({ success: true });
	}

	const { id, ...updateData } = data;
	if (!id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}
	const element = await updateTreeElement(user.id, id, updateData);
	return json(element);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'removeChild') {
		if (!data.parentType || !data.parentId || !data.childId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		await removeChildFromParent(data.parentType, data.parentId, data.childId);
		return json({ success: true });
	}

	if (!data.id) {
		return json({ error: 'ID is required' }, { status: 400 });
	}
	await deleteTreeElement(user.id, data.id);
	return json({ success: true });
};
