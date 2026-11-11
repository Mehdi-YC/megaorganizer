import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { user, todo, program, exercise, invoice, invoiceClient, tag } from '$lib/server/db/schema';
import { ensureSearchIndex } from '$lib/server/db/search-index';
import { globalSearch } from '$lib/server/services/search.service';

const TEST_USER = 'test-user-search';

async function seedUser(id: string) {
	await db
		.insert(user)
		.values({ id, name: 'Test User', email: `${id}@example.com`, emailVerified: true })
		.run();
}

/** Simulate rows that predate their search source: indexed nowhere. */
async function wipeIndex() {
	await db.$client.execute('DELETE FROM search_index');
	await db.$client.execute('DELETE FROM search_doc');
}

describe('global search coverage', () => {
	beforeEach(async () => {
		await db.delete(invoice).run();
		await db.delete(invoiceClient).run();
		await db.delete(todo).run();
		await db.delete(program).run();
		await db.delete(exercise).run();
		await db.delete(tag).run();
		await db.delete(user).run();
		await wipeIndex();
		await seedUser(TEST_USER);
	});

	it('indexes todos, programs, exercises and invoices', async () => {
		await db.insert(todo).values({ userId: TEST_USER, title: 'Quarterly planning meeting' }).run();
		await db.insert(program).values({ userId: TEST_USER, name: 'Marathon preparation' }).run();
		await db
			.insert(exercise)
			.values({ userId: TEST_USER, name: 'Kettlebell swing', muscleGroup: 'full_body' })
			.run();
		const [client] = await db
			.insert(invoiceClient)
			.values({ userId: TEST_USER, name: 'Acme Corp' })
			.returning();
		await db
			.insert(invoice)
			.values({
				userId: TEST_USER,
				clientId: client.id,
				invoiceNumber: 'FAC/2026/001',
				invoiceDate: new Date(),
				dueDate: new Date(),
				year: 2026
			})
			.run();

		await wipeIndex();
		// One indexed row keeps the full-rebuild path out of the way so the
		// per-source backfill runs for the rows above.
		await db.insert(tag).values({ userId: TEST_USER, name: 'seed-tag' }).run();
		await ensureSearchIndex(db.$client);

		const todoHits = await globalSearch(TEST_USER, 'quarterly meeting');
		expect(
			todoHits.some((h) => h.type === 'todo' && h.title === 'Quarterly planning meeting')
		).toBe(true);

		const programHits = await globalSearch(TEST_USER, 'marathon');
		expect(
			programHits.some((h) => h.type === 'program' && h.url.includes('/app/training/programs/'))
		).toBe(true);

		const exerciseHits = await globalSearch(TEST_USER, 'kettlebell');
		expect(exerciseHits.some((h) => h.type === 'exercise')).toBe(true);

		const invoiceHits = await globalSearch(TEST_USER, 'FAC/2026/001');
		expect(invoiceHits.some((h) => h.type === 'invoice' && h.url.includes('/app/invoicing/'))).toBe(
			true
		);
	});

	it('does not index shared built-in exercises', async () => {
		await db
			.insert(exercise)
			.values({
				userId: null,
				name: 'Builtin Barbell Press',
				builtinKey: 'test-builtin',
				muscleGroup: 'chest'
			})
			.run();
		await db
			.insert(exercise)
			.values({ userId: TEST_USER, name: 'Custom Barbell Press', muscleGroup: 'chest' })
			.run();

		await ensureSearchIndex(db.$client);
		const hits = await globalSearch(TEST_USER, 'barbell press');
		expect(hits.some((h) => h.type === 'exercise' && h.title === 'Custom Barbell Press')).toBe(
			true
		);
		expect(hits.some((h) => h.title === 'Builtin Barbell Press')).toBe(false);
	});
});
