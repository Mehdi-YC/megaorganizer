import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { todo, user } from '$lib/server/db/schema';
import {
	createTodo,
	getTodos,
	getTodayAndOverdueTodos,
	toggleTodo,
	deleteTodo,
	updateTodo
} from '$lib/server/services/todo.service';

const TEST_USER = 'test-user-todo';

describe('todo service', () => {
	beforeEach(async () => {
		await db.delete(todo).run();
		await db.delete(user).run();
		await db
			.insert(user)
			.values({
				id: TEST_USER,
				name: 'Test User',
				email: 'test@example.com',
				emailVerified: true
			})
			.run();
	});

	it('creates and lists todos for user', async () => {
		const t1 = await createTodo(TEST_USER, {
			title: 'Acheter du papier',
			dueDate: '2026-10-31',
			priority: 'high'
		});

		expect(t1.id).toBeDefined();
		expect(t1.title).toBe('Acheter du papier');
		expect(t1.completed).toBe(false);
		expect(t1.priority).toBe('high');

		const todos = await getTodos(TEST_USER);
		expect(todos.length).toBe(1);
		expect(todos[0].title).toBe('Acheter du papier');
	});

	it('fetches today and overdue todos properly', async () => {
		await createTodo(TEST_USER, {
			title: 'Tâche en retard',
			dueDate: '2026-10-25'
		});
		await createTodo(TEST_USER, {
			title: "Tâche d'aujourd'hui",
			dueDate: '2026-10-31'
		});
		await createTodo(TEST_USER, {
			title: 'Tâche future',
			dueDate: '2026-11-05'
		});

		const list = await getTodayAndOverdueTodos(TEST_USER, '2026-10-31');
		expect(list.length).toBe(2);
		const titles = list.map((t) => t.title);
		expect(titles).toContain('Tâche en retard');
		expect(titles).toContain("Tâche d'aujourd'hui");
		expect(titles).not.toContain('Tâche future');
	});

	it('toggles and updates todo status', async () => {
		const created = await createTodo(TEST_USER, { title: 'Faire du sport' });
		expect(created.completed).toBe(false);

		const toggled = await toggleTodo(TEST_USER, created.id);
		expect(toggled?.completed).toBe(true);

		const toggledBack = await toggleTodo(TEST_USER, created.id);
		expect(toggledBack?.completed).toBe(false);

		const updated = await updateTodo(TEST_USER, created.id, {
			title: 'Faire du cardio',
			priority: 'high'
		});
		expect(updated?.title).toBe('Faire du cardio');
		expect(updated?.priority).toBe('high');
	});

	it('deletes todo successfully', async () => {
		const created = await createTodo(TEST_USER, { title: 'À supprimer' });
		const deleted = await deleteTodo(TEST_USER, created.id);
		expect(deleted).toBe(true);

		const list = await getTodos(TEST_USER);
		expect(list.length).toBe(0);
	});
});
