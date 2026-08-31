import { db } from '$lib/server/db';
import { treeElement, treeRelationship, page } from '$lib/server/db/schema';
import { eq, and, asc, like, sql } from 'drizzle-orm';

export type TreeElementType = 'node' | 'item';
export type TreeParentType = 'page' | 'node' | 'item';

export async function createTreeElement(
	userId: string,
	type: TreeElementType,
	data: {
		name: string;
		description?: string;
		markdown?: string;
		imageUrl?: string;
		videoUrl?: string;
		externalUrl?: string;
		tags?: string;
		metadata?: string;
		ydkData?: string;
	}
) {
	const [result] = await db
		.insert(treeElement)
		.values({
			userId,
			type,
			...data
		})
		.returning();

	return result;
}

export async function getTreeElementById(id: string) {
	return db.select().from(treeElement).where(eq(treeElement.id, id)).get();
}

export async function updateTreeElement(
	id: string,
	data: {
		name?: string;
		description?: string;
		markdown?: string;
		imageUrl?: string;
		videoUrl?: string;
		externalUrl?: string;
		tags?: string;
		metadata?: string;
		ydkData?: string;
	}
) {
	const [result] = await db
		.update(treeElement)
		.set(data)
		.where(eq(treeElement.id, id))
		.returning();

	return result;
}

export async function deleteTreeElement(id: string) {
	await db.delete(treeElement).where(eq(treeElement.id, id));
}

export async function getChildrenRecursive(parentType: TreeParentType, parentId: string): Promise<any[]> {
	const allElements = await db.select().from(treeElement).all();
	const allRels = await db.select().from(treeRelationship).all();

	const byId = new Map(allElements.map((e) => [e.id, { ...e, children: [] as any[] }]));

	for (const rel of allRels) {
		const parent = byId.get(rel.parentId);
		const child = byId.get(rel.childId);
		if (parent && child) {
			parent.children.push(child);
		}
	}

	const root = byId.get(parentId);
	if (!root) return [];

	const built = buildTree(root, byId);
	return built.children || [];
}

function buildTree(node: any, byId: Map<string, any>): any {
	const result = { ...node, children: [] as any[] };
	for (const child of node.children) {
		const full = byId.get(child.id);
		if (full) {
			result.children.push(buildTree(full, byId));
		}
	}
	return result;
}

export async function getSubtreeForItem(itemId: string): Promise<any> {
	const allElements = await db.select().from(treeElement).all();
	const allRels = await db.select().from(treeRelationship).all();

	const byId = new Map(allElements.map((e) => [e.id, { ...e, children: [] as any[] }]));

	for (const rel of allRels) {
		const parent = byId.get(rel.parentId);
		const child = byId.get(rel.childId);
		if (parent && child) {
			parent.children.push(child);
		}
	}

	const root = byId.get(itemId);
	if (!root) return null;

	return buildTree(root, byId);
}

export async function getChildren(parentType: TreeParentType, parentId: string) {
	const relationships = await db
		.select()
		.from(treeRelationship)
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId)
			)
		)
		.orderBy(asc(treeRelationship.position))
		.all();

	const children = [];
	for (const rel of relationships) {
		const element = await getTreeElementById(rel.childId);
		if (element) {
			children.push({ ...element, position: rel.position });
		}
	}

	return children;
}

export async function addChildToParent(
	parentType: TreeParentType,
	parentId: string,
	childType: TreeElementType,
	childId: string
) {
	const maxPosition = await db
		.select({ position: treeRelationship.position })
		.from(treeRelationship)
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId)
			)
		)
		.orderBy(asc(treeRelationship.position))
		.all();

	const position = maxPosition.length > 0 ? Math.max(...maxPosition.map((p) => p.position)) + 1 : 0;

	const [result] = await db
		.insert(treeRelationship)
		.values({
			parentType,
			parentId,
			childType,
			childId,
			position
		})
		.returning();

	return result;
}

export async function removeChildFromParent(
	parentType: TreeParentType,
	parentId: string,
	childId: string
) {
	await db
		.delete(treeRelationship)
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId),
				eq(treeRelationship.childId, childId)
			)
		);
}

export async function moveChild(
	parentType: TreeParentType,
	parentId: string,
	childId: string,
	newPosition: number
) {
	await db
		.update(treeRelationship)
		.set({ position: newPosition })
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId),
				eq(treeRelationship.childId, childId)
			)
		);
}

export async function getFullTree(userId: string) {
	const elements = await db
		.select()
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();

	const relationships = await db
		.select()
		.from(treeRelationship)
		.all();

	const elementMap = new Map(elements.map((e) => [e.id, { ...e, children: [] as any[] }]));

	const rootNodes: any[] = [];

	for (const rel of relationships) {
		const parent = elementMap.get(rel.parentId);
		const child = elementMap.get(rel.childId);
		if (parent && child) {
			parent.children.push(child);
		}
	}

	for (const el of elements) {
		const node = elementMap.get(el.id)!;
		const isChild = relationships.some((r) => r.childId === el.id);
		if (!isChild) {
			rootNodes.push(node);
		}
	}

	for (const node of rootNodes) {
		sortChildren(node);
	}

	return rootNodes;
}

function sortChildren(node: any) {
	node.children.sort((a: any, b: any) => a.name.localeCompare(b.name));
	for (const child of node.children) {
		sortChildren(child);
	}
}

export async function searchTreeElements(userId: string, query: string) {
	if (!query || !query.trim()) {
		return db
			.select()
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
			.all();
	}

	const searchTerm = `%${query.trim()}%`;
	const treeResults = await db
		.select()
		.from(treeElement)
		.where(
			and(
				eq(treeElement.userId, userId),
				like(treeElement.name, searchTerm)
			)
		)
		.all();

	const pageResults = (await db
		.select({
			id: page.id,
			userId: page.userId,
			categoryId: page.categoryId,
			name: page.name,
			description: page.description,
			imageUrl: page.imageUrl,
		})
		.from(page)
		.where(
			and(
				eq(page.userId, userId),
				like(page.name, searchTerm)
			)
		)
		.all()).map((p) => ({ ...p, type: 'page' as const }));

	return [...treeResults, ...pageResults];
}
