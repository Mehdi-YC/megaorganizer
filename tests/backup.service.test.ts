import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { todo, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTodo } from '$lib/server/services/todo.service';
import { exportUserDataZip, importUserDataFromZip } from '$lib/server/services/backup.service';

const TEST_USER = 'test-backup-user';

describe('backup zip export and import', () => {
	beforeEach(async () => {
		await db.delete(todo).run();
		await db.delete(user).run();
		await db
			.insert(user)
			.values({
				id: TEST_USER,
				name: 'Backup User',
				email: 'backup@example.com',
				emailVerified: true
			})
			.run();
	});

	it('exports and imports zip archive including todos', async () => {
		await createTodo(TEST_USER, {
			title: 'Acheter des enveloppes',
			priority: 'high'
		});

		const zipBuffer = await exportUserDataZip(TEST_USER);
		expect(zipBuffer).toBeDefined();
		expect(zipBuffer.length).toBeGreaterThan(100);

		// Clear todos
		await db.delete(todo).run();

		// Import from the generated zip buffer
		const result = await importUserDataFromZip(TEST_USER, zipBuffer);
		expect(result.success).toBe(true);
		expect(result.counts.todos).toBe(1);

		const restoredTodos = await db.select().from(todo).where(eq(todo.userId, TEST_USER)).all();
		expect(restoredTodos.length).toBe(1);
		expect(restoredTodos[0].title).toBe('Acheter des enveloppes');
	});
});
