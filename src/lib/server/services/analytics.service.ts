import { db } from '$lib/server/db';
import {
	trainingSession,
	trainingActivity,
	expense,
	reminder,
	treeElement
} from '$lib/server/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

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

	// Get all data in parallel
	const [
		allSessions,
		thisWeekSessions,
		thisMonthSessions,
		thisMonthExpenses,
		lastMonthExpenses,
		allReminders,
		completedReminders,
		allItems,
		thisWeekItems,
		allPages
	] = await Promise.all([
		// All training sessions
		db.select({
			id: trainingSession.id,
			startedAt: trainingSession.startedAt,
			duration: trainingSession.duration
		})
		.from(trainingSession)
		.where(eq(trainingSession.userId, userId))
		.all(),

		// This week sessions
		db.select({ id: trainingSession.id })
		.from(trainingSession)
		.where(and(
			eq(trainingSession.userId, userId),
			gte(trainingSession.startedAt, weekStart)
		))
		.all(),

		// This month sessions
		db.select({ id: trainingSession.id })
		.from(trainingSession)
		.where(and(
			eq(trainingSession.userId, userId),
			gte(trainingSession.startedAt, monthStart)
		))
		.all(),

		// This month expenses
		db.select({
			amount: expense.amount,
			description: expense.description
		})
		.from(expense)
		.where(and(
			eq(expense.userId, userId),
			gte(expense.spentAt, monthStart)
		))
		.all(),

		// Last month expenses
		db.select({ amount: expense.amount })
		.from(expense)
		.where(and(
			eq(expense.userId, userId),
			gte(expense.spentAt, lastMonthStart),
			lte(expense.spentAt, lastMonthEnd)
		))
		.all(),

		// All reminders (last 30 days)
		db.select({
			id: reminder.id,
			completed: reminder.completed,
			dueAt: reminder.dueAt
		})
		.from(reminder)
		.where(and(
			eq(reminder.userId, userId),
			gte(reminder.dueAt, thirtyDaysAgo)
		))
		.all(),

		// Completed reminders (last 30 days)
		db.select({ id: reminder.id })
		.from(reminder)
		.where(and(
			eq(reminder.userId, userId),
			eq(reminder.completed, true),
			gte(reminder.dueAt, thirtyDaysAgo)
		))
		.all(),

		// All items
		db.select({ id: treeElement.id })
		.from(treeElement)
		.where(and(
			eq(treeElement.userId, userId),
			eq(treeElement.type, 'item')
		))
		.all(),

		// Items this week
		db.select({ id: treeElement.id })
		.from(treeElement)
		.where(and(
			eq(treeElement.userId, userId),
			eq(treeElement.type, 'item'),
			gte(treeElement.createdAt, weekStart)
		))
		.all(),

		// Count pages (via tree elements that are nodes)
		db.select({ id: treeElement.id })
		.from(treeElement)
		.where(and(
			eq(treeElement.userId, userId),
			eq(treeElement.type, 'node')
		))
		.all()
	]);

	// Calculate training stats
	const totalDuration = allSessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
	const avgDuration = allSessions.length > 0 ? totalDuration / allSessions.length : 0;

	// Calculate spending stats
	const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
	const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
	const daysInMonth = now.getDate();
	const avgDaily = daysInMonth > 0 ? thisMonthTotal / daysInMonth : 0;

	// Find most common expense description
	const descCounts: Record<string, number> = {};
	for (const exp of thisMonthExpenses) {
		if (exp.description) {
			descCounts[exp.description] = (descCounts[exp.description] || 0) + 1;
		}
	}
	const topExpenseDescription = Object.entries(descCounts)
		.sort((a, b) => b[1] - a[1])
		[0]?.[0] ?? null;

	// Calculate habit stats
	const completionRate = allReminders.length > 0
		? Math.round((completedReminders.length / allReminders.length) * 100)
		: 0;

	// Calculate streak (consecutive days with all reminders completed)
	let currentStreak = 0;
	let bestStreak = 0;
	let tempStreak = 0;

	// Group reminders by date
	const remindersByDate = new Map<string, { total: number; completed: number }>();
	for (const rem of allReminders) {
		const dateKey = new Date(rem.dueAt).toISOString().split('T')[0];
		const existing = remindersByDate.get(dateKey) || { total: 0, completed: 0 };
		existing.total++;
		if (rem.completed) existing.completed++;
		remindersByDate.set(dateKey, existing);
	}

	// Check streak from yesterday backwards
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

	// Check if today's reminders are all completed
	const todayKey = today.toISOString().split('T')[0];
	const todayData = remindersByDate.get(todayKey);
	if (todayData && todayData.completed === todayData.total && todayData.total > 0) {
		currentStreak = tempStreak + 1;
	} else {
		currentStreak = tempStreak;
	}

	return {
		training: {
			totalSessions: allSessions.length,
			totalDuration,
			thisWeekSessions: thisWeekSessions.length,
			thisMonthSessions: thisMonthSessions.length,
			avgDuration: Math.round(avgDuration)
		},
		spending: {
			thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
			lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
			avgDaily: Math.round(avgDaily * 100) / 100,
			topExpenseDescription
		},
		habits: {
			totalReminders: allReminders.length,
			completedReminders: completedReminders.length,
			completionRate,
			currentStreak,
			bestStreak
		},
		products: {
			totalItems: allItems.length,
			itemsThisWeek: thisWeekItems.length,
			totalPages: allPages.length
		}
	};
}