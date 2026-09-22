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
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isOneOf,
	isNumber,
	isBoolean
} from '$lib/server/validate';

const treeTypes = ['node', 'item'] as const;
const parentTypes = ['page', 'node', 'item'] as const;

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);

	const id = event.url.searchParams.get('id');
	const parentType = event.url.searchParams.get('parentType');
	const parentId = event.url.searchParams.get('parentId');
	const search = event.url.searchParams.get('search');

	if (search) {
		return json(await searchTreeElements(user.id, search));
	}

	if (id) {
		const element = await getTreeElementById(user.id, id);
		if (!element) return json({ error: 'Not found' }, { status: 404 });
		return json(element);
	}

	if (parentType && parentId) {
		if (!['page', 'node', 'item'].includes(parentType)) {
			return json({ error: 'Invalid parentType' }, { status: 400 });
		}
		return json(await getChildren(user.id, parentType as 'page' | 'node' | 'item', parentId));
	}

	const subtreeId = event.url.searchParams.get('subtree');
	if (subtreeId) {
		const subtree = await getSubtreeForItem(user.id, subtreeId);
		return json(subtree ? [subtree] : []);
	}

	return json(await searchTreeElements(user.id, ''));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'create': {
			const v = validateBody(body, {
				type: { validate: isOneOf(treeTypes), label: 'Type' },
				name: { validate: isNonEmptyString, label: 'Name' }
			});
			if (!v.ok) return v.error;
			const element = await createTreeElement(user.id, v.data.type, v.data as any);
			return json(element, { status: 201 });
		}

		case 'addChild': {
			const v = validateBody(body, {
				parentType: { validate: isOneOf(parentTypes), label: 'Parent type' },
				parentId: { validate: isNonEmptyString, label: 'Parent ID' },
				childType: { validate: isOneOf(treeTypes), label: 'Child type' },
				childId: { validate: isNonEmptyString, label: 'Child ID' }
			});
			if (!v.ok) return v.error;
			const result = await addChildToParent(
				user.id,
				v.data.parentType,
				v.data.parentId,
				v.data.childType,
				v.data.childId
			);
			if (!result)
				return json({ error: 'Child element not found or access denied' }, { status: 404 });
			return json(result, { status: 201 });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);

	if (body.action === 'move') {
		const v = validateBody(body, {
			parentType: { validate: isOneOf(parentTypes), label: 'Parent type' },
			parentId: { validate: isNonEmptyString, label: 'Parent ID' },
			childId: { validate: isNonEmptyString, label: 'Child ID' },
			position: { validate: isNumber, label: 'Position' }
		});
		if (!v.ok) return v.error;
		await moveChild(user.id, v.data.parentType, v.data.parentId, v.data.childId, v.data.position);
		return json({ success: true });
	}

	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' },
		name: { validate: isString, required: false },
		description: { validate: isString, required: false },
		markdown: { validate: isString, required: false },
		imageUrl: { validate: isString, required: false },
		videoUrl: { validate: isString, required: false },
		externalUrl: { validate: isString, required: false },
		tags: { validate: isString, required: false },
		metadata: { validate: isString, required: false },
		ydkData: { validate: isString, required: false },
		favorite: { validate: isBoolean, required: false }
	});
	if (!v.ok) return v.error;

	// Only whitelisted, validated fields are forwarded — never the raw body.
	const { id, ...updateData } = v.data;
	const element = await updateTreeElement(user.id, id, updateData);
	if (!element) return json({ error: 'Not found' }, { status: 404 });
	return json(element);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);

	if (body.action === 'removeChild') {
		const v = validateBody(body, {
			parentType: { validate: isOneOf(parentTypes), label: 'Parent type' },
			parentId: { validate: isNonEmptyString, label: 'Parent ID' },
			childId: { validate: isNonEmptyString, label: 'Child ID' }
		});
		if (!v.ok) return v.error;
		await removeChildFromParent(user.id, v.data.parentType, v.data.parentId, v.data.childId);
		return json({ success: true });
	}

	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'ID' }
	});
	if (!v.ok) return v.error;

	await deleteTreeElement(user.id, v.data.id);
	return json({ success: true });
};
