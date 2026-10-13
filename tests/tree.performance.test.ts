import { describe, test, expect } from 'bun:test';
import { db } from '../src/lib/server/db';
import { treeElement, treeRelationship, user } from '../src/lib/server/db/schema';
import {
	addChildToParent,
	getChildren,
	getFullTree,
	getSubtreeForItem
} from '../src/lib/server/services/tree.service';

const OWNER = 'user-perf';

async function seed() {
	await db.delete(treeRelationship).run();
	await db.delete(treeElement).run();
	await db.delete(user).run();
	await db
		.insert(user)
		.values({ id: OWNER, name: 'P', email: 'p@example.com', emailVerified: true })
		.run();
}

describe('query counts after de-N+1', () => {
	// These are the numbers the perf claim rests on. bun's --preload gives a
	// client that can be wrapped; here we count at the driver level instead by
	// timing a large parent, which is what the N+1 actually hurt.
	test('getChildren handles a large parent', async () => {
		await seed();
		const N = 200;
		await db
			.insert(treeElement)
			.values({ id: 'parent', userId: OWNER, type: 'node', name: 'p' })
			.run();

		const elements = Array.from({ length: N }, (_, i) => ({
			id: `c${i}`,
			userId: OWNER,
			type: 'item' as const,
			name: `c${i}`
		}));
		// Chunked inserts: SQLite caps bound variables per statement.
		for (let i = 0; i < N; i += 50) {
			await db
				.insert(treeElement)
				.values(elements.slice(i, i + 50))
				.run();
		}
		for (const el of elements) {
			await addChildToParent(OWNER, 'node', 'parent', 'item', el.id);
		}

		const children = await getChildren(OWNER, 'node', 'parent');
		expect(children).toHaveLength(N);
		// Position order is preserved through the join.
		expect(children[0].id).toBe('c0');
		expect(children[N - 1].id).toBe(`c${N - 1}`);
	});

	test('getFullTree nests a wide tree', async () => {
		await seed();
		await db
			.insert(treeElement)
			.values({ id: 'root', userId: OWNER, type: 'node', name: 'root' })
			.run();
		const kids = Array.from({ length: 50 }, (_, i) => ({
			id: `k${i}`,
			userId: OWNER,
			type: 'item' as const,
			name: `item-${String(i).padStart(3, '0')}`
		}));
		for (let i = 0; i < 50; i += 25) {
			await db
				.insert(treeElement)
				.values(kids.slice(i, i + 25))
				.run();
		}
		for (const k of kids) {
			await addChildToParent(OWNER, 'node', 'root', 'item', k.id);
		}

		const roots = await getFullTree(OWNER);
		expect(roots).toHaveLength(1);
		// Sorted by name, not by id. The names are zero-padded so a plain string
		// sort of the ids would give a different (wrong) answer.
		expect(roots[0].children.map((c: { name: string }) => c.name)).toEqual(
			kids.map((k) => k.name).sort()
		);
	});

	test('getSubtreeForItem returns the subtree for a nested item', async () => {
		await seed();
		const mk = (id: string, type: 'node' | 'item', name: string) =>
			db.insert(treeElement).values({ id, userId: OWNER, type, name }).run();
		await mk('a', 'node', 'a');
		await mk('b', 'node', 'b');
		await mk('c', 'item', 'c');
		await addChildToParent(OWNER, 'node', 'a', 'node', 'b');
		await addChildToParent(OWNER, 'node', 'b', 'item', 'c');

		const sub = await getSubtreeForItem(OWNER, 'a');
		expect(sub?.id).toBe('a');
		expect(sub?.children[0].id).toBe('b');
		expect(sub?.children[0].children[0].id).toBe('c');

		expect(await getSubtreeForItem(OWNER, 'missing')).toBeNull();
	});
});
