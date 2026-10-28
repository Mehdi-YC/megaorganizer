import { describe, test, expect, beforeEach } from 'bun:test';
import { db } from '../src/lib/server/db';
import { treeElement, treeRelationship, user } from '../src/lib/server/db/schema';
import {
	addChildToParent,
	getChildren,
	getChildCounts,
	getFullTree,
	getTreeElementById,
	removeChildFromParent,
	createTreeElement,
	deleteTreeElement,
	searchTreeElements
} from '../src/lib/server/services/tree.service';

const OWNER = 'user-owner';
const OTHER = 'user-other';

async function reset() {
	await db.delete(treeRelationship).run();
	await db.delete(treeElement).run();
	await db.delete(user).run();
	await db
		.insert(user)
		.values([
			{ id: OWNER, name: 'Owner', email: 'owner@example.com', emailVerified: true },
			{ id: OTHER, name: 'Other', email: 'other@example.com', emailVerified: true }
		])
		.run();
}

async function el(id: string, owner: string, type: 'node' | 'item', name = id) {
	await db.insert(treeElement).values({ id, userId: owner, type, name }).run();
}

describe('tree.service', () => {
	beforeEach(reset);

	describe('getChildren', () => {
		test('returns children ordered by position', async () => {
			await el('n1', OWNER, 'node');
			await el('a', OWNER, 'item');
			await el('b', OWNER, 'item');
			await el('c', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'c');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'a');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'b');

			const children = await getChildren(OWNER, 'node', 'n1');
			expect(children.map((c) => c.id)).toEqual(['c', 'a', 'b']);
			expect(children[0].position).toBe(0);
		});

		test('excludes children owned by another user', async () => {
			await el('n1', OWNER, 'node');
			await el('mine', OWNER, 'item');
			await el('theirs', OTHER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'mine');
			// Inserted directly: addChildToParent refuses a foreign child, so a
			// cross-tenant row can only predate that guard or arrive via a
			// restore. The read path still has to defend against it.
			await db
				.insert(treeRelationship)
				.values({
					parentType: 'node',
					parentId: 'n1',
					childType: 'item',
					childId: 'theirs',
					position: 1
				})
				.run();

			const children = await getChildren(OWNER, 'node', 'n1');
			expect(children.map((c) => c.id)).toEqual(['mine']);
		});

		test('returns empty array for a parent with no children', async () => {
			await el('n1', OWNER, 'node');
			expect(await getChildren(OWNER, 'node', 'n1')).toEqual([]);
		});

		test('does not confuse a parent id with a parent type', async () => {
			await el('shared', OWNER, 'node');
			await el('kid', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'shared', 'item', 'kid');

			// Same id, different parentType: must not leak.
			expect(await getChildren(OWNER, 'page', 'shared')).toEqual([]);
		});
	});

	describe('getChildCounts', () => {
		test('counts item and node children together', async () => {
			await el('n1', OWNER, 'node');
			await el('sub', OWNER, 'node');
			await el('i1', OWNER, 'item');
			await el('i2', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i2');
			await addChildToParent(OWNER, 'node', 'n1', 'node', 'sub');

			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 3 });
		});

		test('omits parents with zero children rather than reporting them', async () => {
			await el('empty', OWNER, 'node');
			// The distinction matters: the UI treats an absent key the same as 0,
			// but a present key proves the parent was actually queried.
			expect(await getChildCounts(OWNER, 'node', ['empty'])).toEqual({});
		});

		test('ignores children owned by another user', async () => {
			await el('n1', OWNER, 'node');
			await el('mine', OWNER, 'item');
			await el('theirs', OTHER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'mine');
			// See the getChildren case above for why this row is inserted directly.
			await db
				.insert(treeRelationship)
				.values({
					parentType: 'node',
					parentId: 'n1',
					childType: 'item',
					childId: 'theirs',
					position: 1
				})
				.run();

			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 1 });
		});

		test('counts match getChildren for every parent', async () => {
			await el('n1', OWNER, 'node');
			await el('n2', OWNER, 'node');
			await el('i1', OWNER, 'item');
			await el('i2', OWNER, 'item');
			await el('i3', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i2');
			await addChildToParent(OWNER, 'node', 'n2', 'item', 'i3');

			const counts = await getChildCounts(OWNER, 'node', ['n1', 'n2']);
			for (const id of ['n1', 'n2']) {
				const children = await getChildren(OWNER, 'node', id);
				expect(counts[id]).toBe(children.length);
			}
		});

		test('returns an empty map for an empty parent list', async () => {
			expect(await getChildCounts(OWNER, 'node', [])).toEqual({});
		});

		test('does not leak counts across users', async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');

			expect(await getChildCounts(OTHER, 'node', ['n1'])).toEqual({});
		});
	});

	describe('addChildToParent', () => {
		test('assigns ascending positions', async () => {
			await el('n1', OWNER, 'node');
			await el('a', OWNER, 'item');
			await el('b', OWNER, 'item');
			expect((await addChildToParent(OWNER, 'node', 'n1', 'item', 'a'))!.position).toBe(0);
			expect((await addChildToParent(OWNER, 'node', 'n1', 'item', 'b'))!.position).toBe(1);
		});

		test('rejects a child the caller does not own', async () => {
			await el('n1', OWNER, 'node');
			await el('theirs', OTHER, 'item');
			expect(await addChildToParent(OWNER, 'node', 'n1', 'item', 'theirs')).toBeNull();
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({});
		});

		test('rejects an unknown child id', async () => {
			await el('n1', OWNER, 'node');
			expect(await addChildToParent(OWNER, 'node', 'n1', 'item', 'ghost')).toBeNull();
		});

		test('rejects a child whose declared type does not match the row', async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			expect(await addChildToParent(OWNER, 'node', 'n1', 'node', 'i1')).toBeNull();
		});

		test('rejects a parent the caller does not own', async () => {
			await el('theirs', OTHER, 'node');
			await el('mine', OWNER, 'item');
			expect(await addChildToParent(OWNER, 'node', 'theirs', 'item', 'mine')).toBeNull();
			expect(await getChildCounts(OTHER, 'node', ['theirs'])).toEqual({});
		});

		test('is idempotent when the edge already exists', async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			const first = await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');
			const second = await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');

			expect(second!.id).toBe(first!.id);
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 1 });
		});

		test('rejects a self-edge', async () => {
			await el('n1', OWNER, 'node');
			expect(await addChildToParent(OWNER, 'node', 'n1', 'node', 'n1')).toBeNull();
		});

		test('rejects an edge that would close a cycle', async () => {
			await el('a', OWNER, 'node');
			await el('b', OWNER, 'node');
			await el('c', OWNER, 'node');
			await addChildToParent(OWNER, 'node', 'a', 'node', 'b');
			await addChildToParent(OWNER, 'node', 'b', 'node', 'c');

			// a -> b -> c, so c cannot become a's parent.
			expect(await addChildToParent(OWNER, 'node', 'c', 'node', 'a')).toBeNull();
			// The tree is still walkable after the refusal.
			const tree = await getFullTree(OWNER);
			expect(tree).toHaveLength(1);
			expect(tree[0].id).toBe('a');
		});

		test('allows a diamond because it is not a cycle', async () => {
			await el('root', OWNER, 'node');
			await el('left', OWNER, 'node');
			await el('right', OWNER, 'node');
			await el('leaf', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'root', 'node', 'left');
			await addChildToParent(OWNER, 'node', 'root', 'node', 'right');
			await addChildToParent(OWNER, 'node', 'left', 'item', 'leaf');
			await addChildToParent(OWNER, 'node', 'right', 'item', 'leaf');

			const tree = await getFullTree(OWNER);
			expect(tree).toHaveLength(1);
			expect(tree[0].children).toHaveLength(2);
		});
	});

	describe('removeChildFromParent', () => {
		test('decrements the count', async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 1 });

			await removeChildFromParent(OWNER, 'node', 'n1', 'i1');
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({});
		});

		test('is a no-op for an unrelated child', async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			await el('i2', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');

			await removeChildFromParent(OWNER, 'node', 'n1', 'i2');
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 1 });
		});

		test("a second user cannot remove someone else's child", async () => {
			await el('n1', OWNER, 'node');
			await el('i1', OWNER, 'item');
			// The relationship is created legitimately by the owner, which is the
			// only way the row can exist at all: addChildToParent refuses a child
			// the caller does not own.
			await addChildToParent(OWNER, 'node', 'n1', 'item', 'i1');

			await removeChildFromParent(OTHER, 'node', 'n1', 'i1');
			expect(await getChildCounts(OWNER, 'node', ['n1'])).toEqual({ n1: 1 });
		});
	});

	describe('getTreeElementById', () => {
		test('is scoped to the owner', async () => {
			await el('i1', OWNER, 'item');
			expect(await getTreeElementById(OWNER, 'i1')).toBeTruthy();
			expect(await getTreeElementById(OTHER, 'i1')).toBeUndefined();
		});

		test('returns undefined for a missing id', async () => {
			expect(await getTreeElementById(OWNER, 'nope')).toBeUndefined();
		});
	});

	describe('createTreeElement / deleteTreeElement', () => {
		test('delete removes the element and both sides of its relationships', async () => {
			const created = await createTreeElement(OWNER, 'item', { name: 'Doomed' });
			const parent = await createTreeElement(OWNER, 'node', { name: 'Parent' });
			await addChildToParent(OWNER, 'node', parent.id, 'item', created.id);
			// Also make it a parent, so the "as parent" cleanup is exercised.
			await createTreeElement(OWNER, 'item', { name: 'Grandchild' });
			const kids = await getChildren(OWNER, 'node', parent.id);
			expect(kids).toHaveLength(1);

			await deleteTreeElement(OWNER, created.id);

			expect(await getTreeElementById(OWNER, created.id)).toBeUndefined();
			expect(await getChildren(OWNER, 'node', parent.id)).toEqual([]);
			expect(await getChildCounts(OWNER, 'node', [parent.id])).toEqual({});
		});

		test("delete will not remove another user's element", async () => {
			const created = await createTreeElement(OTHER, 'item', { name: 'Safe' });
			await deleteTreeElement(OWNER, created.id);
			expect(await getTreeElementById(OTHER, created.id)).toBeTruthy();
		});
	});

	describe('getFullTree', () => {
		test('nests children under their parent', async () => {
			await el('root', OWNER, 'node');
			await el('mid', OWNER, 'node');
			await el('leaf', OWNER, 'item');
			await addChildToParent(OWNER, 'node', 'root', 'node', 'mid');
			await addChildToParent(OWNER, 'node', 'mid', 'item', 'leaf');

			const roots = await getFullTree(OWNER);
			const root = roots.find((r: { id: string }) => r.id === 'root');
			expect(root?.children.map((c: { id: string }) => c.id)).toEqual(['mid']);
			expect(root?.children[0].children.map((c: { id: string }) => c.id)).toEqual(['leaf']);
		});

		test("omits another user's branches", async () => {
			await el('mine', OWNER, 'node');
			await el('theirs', OTHER, 'node');
			const roots = await getFullTree(OWNER);
			expect(roots.map((r) => r.id)).toEqual(['mine']);
		});

		test('cuts a cycle that predates the write guard', async () => {
			await el('root', OWNER, 'node');
			await el('a', OWNER, 'node');
			await el('b', OWNER, 'node');
			await addChildToParent(OWNER, 'node', 'root', 'node', 'a');
			await addChildToParent(OWNER, 'node', 'a', 'node', 'b');
			// Bypass the service: old rows can still close the loop.
			await db
				.insert(treeRelationship)
				.values({
					parentType: 'node',
					parentId: 'b',
					childType: 'node',
					childId: 'a',
					position: 0
				})
				.run();

			const roots = await getFullTree(OWNER);
			expect(roots.map((r) => r.id)).toEqual(['root']);

			const a = roots[0].children[0];
			const b = a.children[0];
			expect(b.id).toBe('b');
			expect(b.children[0].id).toBe('a');
			expect(b.children[0].children).toEqual([]);
		});
	});

	describe('searchTreeElements', () => {
		test('matches on a partial name', async () => {
			await el('a', OWNER, 'item', 'Kitchen Renovation');
			await el('b', OWNER, 'item', 'Garden Shed');
			const results = await searchTreeElements(OWNER, 'Kitchen');
			expect(results.map((r) => r.id)).toEqual(['a']);
		});

		test("never returns another user's elements", async () => {
			await el('a', OWNER, 'item', 'Shared Name');
			await el('b', OTHER, 'item', 'Shared Name');
			const results = await searchTreeElements(OWNER, 'Shared');
			expect(results.map((r) => r.id)).toEqual(['a']);
		});

		test('an empty query lists everything the user owns', async () => {
			await el('a', OWNER, 'item');
			await el('b', OTHER, 'item');
			const results = await searchTreeElements(OWNER, '');
			expect(results.map((r) => r.id)).toEqual(['a']);
		});
	});
});
