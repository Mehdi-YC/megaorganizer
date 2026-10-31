import { db } from '$lib/server/db';
import { todo } from '$lib/server/db/schema';
import { eq, and, desc, asc, isNull, or, lte, gte } from 'drizzle-orm';
import type { Todo } from '$lib/types';

export async function getTodos(
	userId: string,
	options?: {
		completed?: boolean;
		dueDate?: string | null;
	}
): Promise<Todo[]> {
	const conditions = [eq(todo.userId, userId)];

	if (options?.completed !== undefined) {
		conditions.push(eq(todo.completed, options.completed));
	}

	if (options?.dueDate !== undefined) {
		if (options.dueDate === null) {
			conditions.push(isNull(todo.dueDate));
		} else {
			conditions.push(eq(todo.dueDate, options.dueDate));
		}
	}

	const rows = await db
		.select()
		.from(todo)
		.where(and(...conditions))
		.orderBy(asc(todo.completed), asc(todo.position), desc(todo.createdAt))
		.all();

	return rows.map((r) => ({
		...r,
		priority: r.priority as 'low' | 'medium' | 'high'
	}));
}

export async function getTodosForDate(userId: string, dateStr: string): Promise<Todo[]> {
	const rows = await db
		.select()
		.from(todo)
		.where(and(eq(todo.userId, userId), eq(todo.dueDate, dateStr)))
		.orderBy(asc(todo.completed), asc(todo.position), desc(todo.createdAt))
		.all();

	return rows.map((r) => ({
		...r,
		priority: r.priority as 'low' | 'medium' | 'high'
	}));
}

export async function getTodosForDateRange(
	userId: string,
	startDate: string,
	endDate: string
): Promise<Todo[]> {
	const rows = await db
		.select()
		.from(todo)
		.where(
			and(
				eq(todo.userId, userId),
				// dueDate between startDate and endDate
				gte(todo.dueDate, startDate),
				lte(todo.dueDate, endDate)
			)
		)
		.orderBy(asc(todo.dueDate), asc(todo.position))
		.all();

	return rows.map((r) => ({
		...r,
		priority: r.priority as 'low' | 'medium' | 'high'
	}));
}

export async function getTodayAndOverdueTodos(userId: string, todayStr: string): Promise<Todo[]> {
	const rows = await db
		.select()
		.from(todo)
		.where(
			and(
				eq(todo.userId, userId),
				or(
					// Todo scheduled for today
					eq(todo.dueDate, todayStr),
					// Or overdue and not completed
					and(lte(todo.dueDate, todayStr), eq(todo.completed, false))
				)
			)
		)
		.orderBy(asc(todo.completed), desc(todo.priority), asc(todo.position), desc(todo.createdAt))
		.all();

	return rows.map((r) => ({
		...r,
		priority: r.priority as 'low' | 'medium' | 'high'
	}));
}

export async function getTodoById(userId: string, id: string): Promise<Todo | null> {
	const row = await db.query.todo.findFirst({
		where: and(eq(todo.id, id), eq(todo.userId, userId))
	});
	if (!row) return null;
	return {
		...row,
		priority: row.priority as 'low' | 'medium' | 'high'
	};
}

export async function createTodo(
	userId: string,
	data: {
		title: string;
		dueDate?: string | null;
		dueTime?: string | null;
		priority?: 'low' | 'medium' | 'high';
		position?: number;
	}
): Promise<Todo> {
	const [created] = await db
		.insert(todo)
		.values({
			userId,
			title: data.title.trim(),
			dueDate: data.dueDate || null,
			dueTime: data.dueTime || null,
			priority: data.priority || 'medium',
			position: data.position ?? 0
		})
		.returning();

	return {
		...created,
		priority: created.priority as 'low' | 'medium' | 'high'
	};
}

export async function updateTodo(
	userId: string,
	id: string,
	updates: Partial<{
		title: string;
		completed: boolean;
		dueDate: string | null;
		dueTime: string | null;
		priority: 'low' | 'medium' | 'high';
		position: number;
	}>
): Promise<Todo | null> {
	const existing = await getTodoById(userId, id);
	if (!existing) return null;

	const valuesToSet: Record<string, unknown> = {};

	if (updates.title !== undefined) {
		valuesToSet.title = updates.title.trim();
	}
	if (updates.completed !== undefined) {
		valuesToSet.completed = updates.completed;
		valuesToSet.completedAt = updates.completed ? new Date() : null;
	}
	if (updates.dueDate !== undefined) {
		valuesToSet.dueDate = updates.dueDate || null;
	}
	if (updates.dueTime !== undefined) {
		valuesToSet.dueTime = updates.dueTime || null;
	}
	if (updates.priority !== undefined) {
		valuesToSet.priority = updates.priority;
	}
	if (updates.position !== undefined) {
		valuesToSet.position = updates.position;
	}

	const [updated] = await db
		.update(todo)
		.set(valuesToSet)
		.where(and(eq(todo.id, id), eq(todo.userId, userId)))
		.returning();

	return {
		...updated,
		priority: updated.priority as 'low' | 'medium' | 'high'
	};
}

export async function toggleTodo(userId: string, id: string): Promise<Todo | null> {
	const existing = await getTodoById(userId, id);
	if (!existing) return null;

	return updateTodo(userId, id, { completed: !existing.completed });
}

export async function deleteTodo(userId: string, id: string): Promise<boolean> {
	const result = await db
		.delete(todo)
		.where(and(eq(todo.id, id), eq(todo.userId, userId)))
		.run();

	return result.rowsAffected > 0;
}
