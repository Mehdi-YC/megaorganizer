import { db } from '$lib/server/db';
import { trainingSession, expense, reminder, treeElement } from '$lib/server/db/schema';
import { eq, and, gte, isNotNull, desc, count, sql } from 'drizzle-orm';

export interface AnalyticsData {
	training: {
		totalSessions: number;
		totalDuration: number; // in seconds
		thisWeekSessions: number;
		thisMonthSessions: number;
		avgDuration: number;
	};
	spending: {
		thisMonthTotal: number;
		lastMonthTotal: number;
		avgDaily: number;
		topExpenseDescription: string | null;
	};
	habits: {
		totalReminders: number;
		completedReminders: number;
		completionRate: number;
		currentStreak: number;
		bestStreak: number;
	};
	products: {
		totalItems: number;
		itemsThisWeek: number;
		totalPages: number;
	};
}

/**
 * Dashboard analytics. Every figure is computed in SQL (counts, sums and
 * one grouping per domain); only the small per-day reminder grouping comes
 * back to JS, for the streak calculation.
 */
export async function getAnalytics(userId: string): Promise<AnalyticsData> {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Week start (Monday)
	const weekStart = new Date(today);
	const dayOfWeek = weekStart.getDay();
	const diff = (dayOfWeek + 6) % 7;
	weekStart.setDate(weekStart.getDate() - diff);

	// Month start
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	// Last month start/end
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	// 30 days ago
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [trainingRow, spendingRow, topExpenseRow, reminderDays, productRow] = await Promise.all([
		db
			.select({
				totalSessions: count(),
				totalDuration: sql<number>`COALESCE(SUM(${trainingSession.duration}), 0)`,
				weekSessions: sql<number>`SUM(CASE WHEN ${trainingSession.startedAt} >= ${weekStart.getTime()} THEN 1 ELSE 0 END)`,
				monthSessions: sql<number>`SUM(CASE WHEN ${trainingSession.startedAt} >= ${monthStart.getTime()} THEN 1 ELSE 0 END)`
			})
			.from(trainingSession)
			.where(eq(trainingSession.userId, userId)),

		db
			.select({
				thisMonthTotal: sql<number>`COALESCE(SUM(CASE WHEN ${expense.spentAt} >= ${monthStart.getTime()} THEN ${expense.amount} ELSE 0 END), 0)`,
				lastMonthTotal: sql<number>`COALESCE(SUM(CASE WHEN ${expense.spentAt} >= ${lastMonthStart.getTime()} AND ${expense.spentAt} <= ${lastMonthEnd.getTime()} THEN ${expense.amount} ELSE 0 END), 0)`
			})
			.from(expense)
			.where(eq(expense.userId, userId)),

		db
			.select({ description: expense.description, hits: count() })
			.from(expense)
			.where(
				and(
					eq(expense.userId, userId),
					gte(expense.spentAt, monthStart),
					isNotNull(expense.description)
				)
			)
			.groupBy(expense.description)
			.orderBy(desc(count()))
			.limit(1),

		// One row per UTC day, enough to walk the completion streak.
		db
			.select({
				day: sql<string>`date(${reminder.dueAt} / 1000, 'unixepoch')`,
				total: count(),
				completed: sql<number>`SUM(CASE WHEN ${reminder.completed} THEN 1 ELSE 0 END)`
			})
			.from(reminder)
			.where(and(eq(reminder.userId, userId), gte(reminder.dueAt, thirtyDaysAgo)))
			.groupBy(sql`date(${reminder.dueAt} / 1000, 'unixepoch')`),

		db
			.select({
				totalItems: sql<number>`SUM(CASE WHEN ${treeElement.type} = 'item' THEN 1 ELSE 0 END)`,
				itemsThisWeek: sql<number>`SUM(CASE WHEN ${treeElement.type} = 'item' AND ${treeElement.createdAt} >= ${weekStart.getTime()} THEN 1 ELSE 0 END)`,
				totalPages: sql<number>`SUM(CASE WHEN ${treeElement.type} = 'node' THEN 1 ELSE 0 END)`
			})
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
	]);

	const totalSessions = trainingRow[0]?.totalSessions ?? 0;
	const totalDuration = trainingRow[0]?.totalDuration ?? 0;
	const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

	const thisMonthTotal = spendingRow[0]?.thisMonthTotal ?? 0;
	const lastMonthTotal = spendingRow[0]?.lastMonthTotal ?? 0;
	const daysInMonth = now.getDate();
	const avgDaily = daysInMonth > 0 ? thisMonthTotal / daysInMonth : 0;
	const topExpenseDescription = topExpenseRow[0]?.description ?? null;

	// Streak: consecutive days with every reminder completed.
	const remindersByDate = new Map<string, { total: number; completed: number }>();
	let totalReminders = 0;
	let completedReminders = 0;
	for (const row of reminderDays) {
		remindersByDate.set(row.day, { total: row.total, completed: row.completed });
		totalReminders += row.total;
		completedReminders += row.completed;
	}
	const completionRate =
		totalReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0;

	let bestStreak = 0;
	let tempStreak = 0;
	const checkDate = new Date(today);
	checkDate.setDate(checkDate.getDate() - 1);

	while (true) {
		const dateKey = checkDate.toISOString().split('T')[0];
		const dayData = remindersByDate.get(dateKey);
		if (!dayData || dayData.total === 0) break;

		if (dayData.completed === dayData.total) {
			tempStreak++;
			bestStreak = Math.max(bestStreak, tempStreak);
		} else {
			break;
		}
		checkDate.setDate(checkDate.getDate() - 1);
	}

	const todayKey = today.toISOString().split('T')[0];
	const todayData = remindersByDate.get(todayKey);
	const currentStreak =
		todayData && todayData.completed === todayData.total && todayData.total > 0
			? tempStreak + 1
			: tempStreak;

	return {
		training: {
			totalSessions,
			totalDuration,
			thisWeekSessions: trainingRow[0]?.weekSessions ?? 0,
			thisMonthSessions: trainingRow[0]?.monthSessions ?? 0,
			avgDuration: Math.round(avgDuration)
		},
		spending: {
			thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
			lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
			avgDaily: Math.round(avgDaily * 100) / 100,
			topExpenseDescription
		},
		habits: {
			totalReminders,
			completedReminders,
			completionRate,
			currentStreak,
			bestStreak
		},
		products: {
			totalItems: productRow[0]?.totalItems ?? 0,
			itemsThisWeek: productRow[0]?.itemsThisWeek ?? 0,
			totalPages: productRow[0]?.totalPages ?? 0
		}
	};
}
