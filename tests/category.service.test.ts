import { describe, test, expect, beforeEach } from 'bun:test';
import { db } from '../src/lib/server/db';
import { category, page, user } from '../src/lib/server/db/schema';
import { getCategoriesWithPages } from '../src/lib/server/services/category.service';

const OWNER = 'user-owner';
const OTHER = 'user-other';

async function reset() {
	await db.delete(page).run();
	await db.delete(category).run();
	await db.delete(user).run();
	await db
		.insert(user)
		.values([
			{ id: OWNER, name: 'Owner', email: 'owner@example.com', emailVerified: true },
			{ id: OTHER, name: 'Other', email: 'other@example.com', emailVerified: true }
		])
		.run();
}

describe('getCategoriesWithPages', () => {
	beforeEach(reset);

	test('groups pages under their category and keeps category order', async () => {
		await db
			.insert(category)
			.values([
				{ id: 'c1', userId: OWNER, name: 'One', position: 0 },
				{ id: 'c2', userId: OWNER, name: 'Two', position: 1 }
			])
			.run();
		await db
			.insert(page)
			.values([
				{ id: 'p2', userId: OWNER, categoryId: 'c1', name: 'Second', position: 1 },
				{ id: 'p1', userId: OWNER, categoryId: 'c1', name: 'First', position: 0 },
				{ id: 'p3', userId: OWNER, categoryId: 'c2', name: 'Third', position: 0 }
			])
			.run();

		const result = await getCategoriesWithPages(OWNER);

		expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
		expect(result[0].pages?.map((p) => p.id)).toEqual(['p1', 'p2']);
		expect(result[1].pages?.map((p) => p.id)).toEqual(['p3']);
	});

	test('never returns another user’s pages', async () => {
		await db
			.insert(category)
			.values([
				{ id: 'mine', userId: OWNER, name: 'Mine' },
				{ id: 'theirs', userId: OTHER, name: 'Theirs' }
			])
			.run();
		await db
			.insert(page)
			.values([
				{ id: 'mine-page', userId: OWNER, categoryId: 'mine', name: 'Mine' },
				{ id: 'their-page', userId: OTHER, categoryId: 'theirs', name: 'Theirs' }
			])
			.run();

		const result = await getCategoriesWithPages(OWNER);

		expect(result.map((c) => c.id)).toEqual(['mine']);
		expect(result[0].pages?.map((p) => p.id)).toEqual(['mine-page']);
	});
});
