import { db } from '$lib/server/db';
import { treeElement, treeRelationship, page } from '$lib/server/db/schema';
import type { TreeElement, TreeElementNode } from '$lib/types';
import { eq, and, or, asc, like, inArray, count } from 'drizzle-orm';
import {
	rebuildDocLinks,
	rebindDanglingLinks,
	unlinkDeletedTarget,
	deleteSourceLinks
} from './wikilink.service';

export type TreeElementType = 'node' | 'item';
export type TreeParentType = 'page' | 'node' | 'item';

async function verifyElementOwnership(userId: string, elementId: string): Promise<boolean> {
	const el = await db
		.select({ id: treeElement.id })
		.from(treeElement)
		.where(and(eq(treeElement.id, elementId), eq(treeElement.userId, userId)))
		.get();
	return !!el;
}

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
		favorite?: boolean;
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

	await rebuildDocLinks(userId, 'tree_element', result.id, data.markdown);
	await rebindDanglingLinks(userId, result.name, 'tree_element', result.id);

	return result;
}

export async function getTreeElementById(userId: string, id: string) {
	return db
		.select()
		.from(treeElement)
		.where(and(eq(treeElement.id, id), eq(treeElement.userId, userId)))
		.get();
}

export async function updateTreeElement(
	userId: string,
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
		favorite?: boolean;
	}
) {
	const [result] = await db
		.update(treeElement)
		.set(data)
		.where(and(eq(treeElement.id, id), eq(treeElement.userId, userId)))
		.returning();

	if (result) {
		if (data.markdown !== undefined) {
			await rebuildDocLinks(userId, 'tree_element', id, data.markdown);
		}
		if (data.name !== undefined) {
			await rebindDanglingLinks(userId, result.name, 'tree_element', id);
		}
	}

	return result;
}

export async function deleteTreeElement(userId: string, id: string) {
	const owned = await verifyElementOwnership(userId, id);
	if (!owned) return;

	// Clean up relationships where this element is parent or child
	await db
		.delete(treeRelationship)
		.where(or(eq(treeRelationship.parentId, id), eq(treeRelationship.childId, id)));

	await db.delete(treeElement).where(and(eq(treeElement.id, id), eq(treeElement.userId, userId)));

	await deleteSourceLinks(userId, 'tree_element', id);
	await unlinkDeletedTarget('tree_element', id);
}

/**
 * A tree_element row with a children array attached, keyed by id.
 * Both getFullTree and getSubtreeForItem build one of these.
 */
interface NodeWithChildren {
	element: typeof treeElement.$inferSelect;
	children: NodeWithChildren[];
}

/**
 * Relationships for this user only, fetched with an inner join on
 * tree_element rather than by loading the whole table and filtering in JS.
 * The previous version did `select().from(treeRelationship).all()` and then
 * dropped rows by hand, which read every relationship belonging to every user
 * on the instance.
 */
async function getUserRelationships(userId: string) {
	return db
		.select({
			parentId: treeRelationship.parentId,
			childId: treeRelationship.childId
		})
		.from(treeRelationship)
		.innerJoin(treeElement, eq(treeRelationship.childId, treeElement.id))
		.where(eq(treeElement.userId, userId))
		.all();
}

/** Flatten the internal {element, children} shape into the public one. */
function toTree(node: NodeWithChildren): TreeElementNode {
	return {
		...node.element,
		children: node.children.map(toTree).sort((a, b) => a.name.localeCompare(b.name))
	};
}

/** Wire parent/child links into a map of nodes, then return the roots. */
function assemble(
	elements: (typeof treeElement.$inferSelect)[],
	relationships: { parentId: string; childId: string }[]
): NodeWithChildren[] {
	const byId = new Map<string, NodeWithChildren>(
		elements.map((e) => [e.id, { element: e, children: [] }])
	);

	const childIds = new Set<string>();
	for (const rel of relationships) {
		const parent = byId.get(rel.parentId);
		const child = byId.get(rel.childId);
		if (!parent || !child) continue;
		parent.children.push(child);
		childIds.add(rel.childId);
	}

	return [...byId.values()].filter((n) => !childIds.has(n.element.id));
}

export async function getSubtreeForItem(
	userId: string,
	itemId: string
): Promise<TreeElementNode | null> {
	const allElements = await db
		.select()
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();

	const relationships = await getUserRelationships(userId);

	const byId = new Map<string, NodeWithChildren>(
		allElements.map((e) => [e.id, { element: e, children: [] }])
	);

	for (const rel of relationships) {
		const parent = byId.get(rel.parentId);
		const child = byId.get(rel.childId);
		if (parent && child) {
			parent.children.push(child);
		}
	}

	const root = byId.get(itemId);
	if (!root) return null;

	return toTree(root);
}

export async function getChildren(
	userId: string,
	parentType: TreeParentType,
	parentId: string
): Promise<TreeElement[]> {
	// One query, joined. This used to fetch the relationship rows and then
	// await getTreeElementById once per child, which is N+1 for every node the
	// user expands.
	const rows = await db
		.select({ element: treeElement, position: treeRelationship.position })
		.from(treeRelationship)
		.innerJoin(treeElement, eq(treeRelationship.childId, treeElement.id))
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId),
				eq(treeElement.userId, userId)
			)
		)
		.orderBy(asc(treeRelationship.position))
		.all();

	return rows.map((r) => ({ ...r.element, position: r.position }));
}

/**
 * Number of children each parent has, keyed by parent id. Used to render counts
 * for nodes whose children have not been fetched yet (collapsed nodes).
 */
export async function getChildCounts(
	userId: string,
	parentType: TreeParentType,
	parentIds: string[]
): Promise<Record<string, number>> {
	if (parentIds.length === 0) return {};

	const rows = await db
		.select({ parentId: treeRelationship.parentId, total: count() })
		.from(treeRelationship)
		.innerJoin(treeElement, eq(treeRelationship.childId, treeElement.id))
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				inArray(treeRelationship.parentId, parentIds),
				eq(treeElement.userId, userId)
			)
		)
		.groupBy(treeRelationship.parentId)
		.all();

	return Object.fromEntries(rows.map((r) => [r.parentId, Number(r.total)]));
}

/**
 * A parent can be a page or another tree element. Check that it belongs to
 * this user and that the declared type matches the row's real type, so a
 * caller cannot write an edge under a foreign parent or mislabel it.
 */
async function verifyParent(userId: string, parentType: TreeParentType, parentId: string) {
	if (parentType === 'page') {
		const ownPage = await db
			.select({ id: page.id })
			.from(page)
			.where(and(eq(page.id, parentId), eq(page.userId, userId)))
			.get();
		return !!ownPage;
	}

	const element = await db
		.select({ type: treeElement.type })
		.from(treeElement)
		.where(and(eq(treeElement.id, parentId), eq(treeElement.userId, userId)))
		.get();
	return element?.type === parentType;
}

/**
 * True when making `childId` a child of `parentId` would close a loop, which
 * would make the subtree walk recurse forever. Walk up from the prospective
 * parent: if the child is one of its ancestors, the edge is invalid.
 */
async function wouldCreateCycle(userId: string, parentId: string, childId: string) {
	if (parentId === childId) return true;

	const edges = await db
		.select({
			parentId: treeRelationship.parentId,
			childId: treeRelationship.childId
		})
		.from(treeRelationship)
		.innerJoin(treeElement, eq(treeRelationship.childId, treeElement.id))
		.where(eq(treeElement.userId, userId))
		.all();

	const parentsByChild = new Map<string, string[]>();
	for (const edge of edges) {
		const parents = parentsByChild.get(edge.childId) ?? [];
		parents.push(edge.parentId);
		parentsByChild.set(edge.childId, parents);
	}

	const seen = new Set<string>();
	const stack = [parentId];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		if (current === childId) return true;
		if (seen.has(current)) continue;
		seen.add(current);
		stack.push(...(parentsByChild.get(current) ?? []));
	}
	return false;
}

export async function addChildToParent(
	userId: string,
	parentType: TreeParentType,
	parentId: string,
	childType: TreeElementType,
	childId: string
) {
	const child = await db
		.select({ type: treeElement.type })
		.from(treeElement)
		.where(and(eq(treeElement.id, childId), eq(treeElement.userId, userId)))
		.get();
	if (!child || child.type !== childType) return null;

	if (!(await verifyParent(userId, parentType, parentId))) return null;
	if (await wouldCreateCycle(userId, parentId, childId)) return null;

	// Adding an existing child is a no-op rather than a duplicate edge.
	const existing = await db
		.select()
		.from(treeRelationship)
		.where(
			and(
				eq(treeRelationship.parentType, parentType),
				eq(treeRelationship.parentId, parentId),
				eq(treeRelationship.childType, childType),
				eq(treeRelationship.childId, childId)
			)
		)
		.get();
	if (existing) return existing;

	const maxPosition = await db
		.select({ position: treeRelationship.position })
		.from(treeRelationship)
		.where(
			and(eq(treeRelationship.parentType, parentType), eq(treeRelationship.parentId, parentId))
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
	userId: string,
	parentType: TreeParentType,
	parentId: string,
	childId: string
) {
	// Verify the child element belongs to this user
	const childOwned = await verifyElementOwnership(userId, childId);
	if (!childOwned) return;

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
	userId: string,
	parentType: TreeParentType,
	parentId: string,
	childId: string,
	newPosition: number
) {
	// Verify the child element belongs to this user
	const childOwned = await verifyElementOwnership(userId, childId);
	if (!childOwned) return;

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

export async function getFullTree(userId: string): Promise<TreeElementNode[]> {
	const elements = await db.select().from(treeElement).where(eq(treeElement.userId, userId)).all();
	const relationships = await getUserRelationships(userId);
	return assemble(elements, relationships).map(toTree);
}

export async function searchTreeElements(userId: string, query: string) {
	if (!query || !query.trim()) {
		return db.select().from(treeElement).where(eq(treeElement.userId, userId)).all();
	}

	const searchTerm = `%${query.trim()}%`;
	const treeResults = await db
		.select()
		.from(treeElement)
		.where(and(eq(treeElement.userId, userId), like(treeElement.name, searchTerm)))
		.all();

	const pageResults = (
		await db
			.select({
				id: page.id,
				userId: page.userId,
				categoryId: page.categoryId,
				name: page.name,
				description: page.description,
				imageUrl: page.imageUrl
			})
			.from(page)
			.where(and(eq(page.userId, userId), like(page.name, searchTerm)))
			.all()
	).map((p) => ({ ...p, type: 'page' as const }));

	return [...treeResults, ...pageResults];
}
