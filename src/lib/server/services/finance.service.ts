import { db } from '$lib/server/db';
import { expense, userSettings } from '$lib/server/db/schema';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';

// ─── User Settings ───────────────────────────────────────────────────────────

export async function getUserSettings(userId: string) {
	const settings = await db
		.select()
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.get();

	// Return defaults if no settings exist
	if (!settings) {
		return {
			id: null,
			userId,
			currency: 'DZD',
			currencyRate: 1,
			monthlySpendingLimit: null
		};
	}

	return settings;
}

export async function updateUserSettings(
	userId: string,
	data: {
		currency?: string;
		currencyRate?: number;
		monthlySpendingLimit?: number | null;
	}
) {
	// Check if settings exist
	const existing = await db
		.select({ id: userSettings.id })
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.get();

	if (existing) {
		const [updated] = await db
			.update(userSettings)
			.set(data)
			.where(eq(userSettings.userId, userId))
			.returning();
		return updated;
	} else {
		const [created] = await db
			.insert(userSettings)
			.values({
				userId,
				...data
			})
			.returning();
		return created;
	}
}

// ─── Expenses CRUD ───────────────────────────────────────────────────────────

export async function createExpense(
	userId: string,
	data: {
		amount: number;
		currency?: string;
		description?: string;
		markdown?: string;
		tags?: string[];
		spentAt: Date;
	}
) {
	const [result] = await db
		.insert(expense)
		.values({
			userId,
			amount: data.amount,
			currency: data.currency ?? 'DZD',
			description: data.description,
			markdown: data.markdown,
			tags: data.tags ? JSON.stringify(data.tags) : null,
			spentAt: data.spentAt
		})
		.returning();

	return result;
}

export async function getExpenses(
	userId: string,
	options?: {
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}
) {
	const conditions = [eq(expense.userId, userId)];

	if (options?.startDate) {
		conditions.push(gte(expense.spentAt, options.startDate));
	}
	if (options?.endDate) {
		conditions.push(lte(expense.spentAt, options.endDate));
	}

	return db
		.select()
		.from(expense)
		.where(and(...conditions))
		.orderBy(desc(expense.spentAt))
		.limit(options?.limit ?? 50)
		.offset(options?.offset ?? 0)
		.all();
}

export async function getExpenseById(userId: string, expenseId: string) {
	return db
		.select()
		.from(expense)
		.where(and(eq(expense.id, expenseId), eq(expense.userId, userId)))
		.get();
}

export async function updateExpense(
	userId: string,
	expenseId: string,
	data: {
		amount?: number;
		currency?: string;
		description?: string;
		markdown?: string;
		tags?: string[];
		spentAt?: Date;
	}
) {
	const updateData: any = { ...data };
	if (data.tags) {
		updateData.tags = JSON.stringify(data.tags);
	}

	const [updated] = await db
		.update(expense)
		.set(updateData)
		.where(and(eq(expense.id, expenseId), eq(expense.userId, userId)))
		.returning();

	return updated;
}

export async function deleteExpense(userId: string, expenseId: string) {
	await db
		.delete(expense)
		.where(and(eq(expense.id, expenseId), eq(expense.userId, userId)));
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export async function getMonthlyStats(userId: string, year: number, month: number) {
	const startDate = new Date(year, month, 1);
	const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

	const result = await db
		.select({
			total: sql<number>`COALESCE(SUM(${expense.amount}), 0)`,
			count: sql<number>`COUNT(*)`
		})
		.from(expense)
		.where(
			and(
				eq(expense.userId, userId),
				gte(expense.spentAt, startDate),
				lte(expense.spentAt, endDate)
			)
		)
		.get();

	return {
		total: result?.total ?? 0,
		count: result?.count ?? 0,
		year,
		month
	};
}

export async function getDailyStats(userId: string, year: number, month: number) {
	const startDate = new Date(year, month, 1);
	const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

	const results = await db
		.select({
			day: sql<number>`CAST(strftime('%d', ${expense.spentAt} / 1000, 'unixepoch') AS INTEGER)`,
			total: sql<number>`SUM(${expense.amount})`,
			count: sql<number>`COUNT(*)`
		})
		.from(expense)
		.where(
			and(
				eq(expense.userId, userId),
				gte(expense.spentAt, startDate),
				lte(expense.spentAt, endDate)
			)
		)
		.groupBy(sql`strftime('%d', ${expense.spentAt} / 1000, 'unixepoch')`)
		.all();

	return results;
}

export async function getExpensesForDateRange(
	userId: string,
	startDate: Date,
	endDate: Date
) {
	return db
		.select()
		.from(expense)
		.where(
			and(
				eq(expense.userId, userId),
				gte(expense.spentAt, startDate),
				lte(expense.spentAt, endDate)
			)
		)
		.orderBy(desc(expense.spentAt))
		.all();
}

export async function getMonthlyTotalForDateRange(
	userId: string,
	startDate: Date,
	endDate: Date
) {
	const results = await db
		.select({
			year: sql<number>`CAST(strftime('%Y', ${expense.spentAt} / 1000, 'unixepoch') AS INTEGER)`,
			month: sql<number>`CAST(strftime('%m', ${expense.spentAt} / 1000, 'unixepoch') AS INTEGER)`,
			total: sql<number>`SUM(${expense.amount})`,
			count: sql<number>`COUNT(*)`
		})
		.from(expense)
		.where(
			and(
				eq(expense.userId, userId),
				gte(expense.spentAt, startDate),
				lte(expense.spentAt, endDate)
			)
		)
		.groupBy(
			sql`strftime('%Y-%m', ${expense.spentAt} / 1000, 'unixepoch')`
		)
		.all();

	return results;
}
