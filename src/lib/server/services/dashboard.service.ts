import { db } from '$lib/server/db';
import { treeElement, trainingSession, dashboardNote } from '$lib/server/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { getTrainingSessionsWithActivities } from './training.service';
import { getDueReminders, generateDueReminders, getUpcomingReminders } from './reminder.service';
import { getAnalytics } from './analytics.service';
import { getUserSettings } from './finance.service';

function getWeeklyTrainingMinutes(
	sessions: Array<{ startedAt: Date | string; duration: number | null }>
) {
	const now = new Date();
	const weeks: number[] = [];
	for (let i = 11; i >= 0; i--) {
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - (i * 7 + now.getDay()));
		weekStart.setHours(0, 0, 0, 0);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 7);
		const minutes = sessions
			.filter((s) => {
				const d = new Date(s.startedAt);
				return d >= weekStart && d < weekEnd;
			})
			.reduce((acc, s) => acc + (s.duration ?? 0) / 60, 0);
		weeks.push(Math.round(minutes));
	}
	return weeks;
}

export async function getDashboardData(userId: string) {
	// Generate any due reminders first
	await generateDueReminders(userId);

	const [
		recentItems,
		recentSessions,
		allItems,
		allSessions,
		dueReminders,
		upcomingEvents,
		analytics,
		settings,
		note
	] = await Promise.all([
		db
			.select({
				id: treeElement.id,
				name: treeElement.name,
				type: treeElement.type,
				imageUrl: treeElement.imageUrl,
				favorite: treeElement.favorite,
				updatedAt: treeElement.updatedAt
			})
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
			.orderBy(desc(treeElement.updatedAt))
			.limit(6),
		getTrainingSessionsWithActivities(userId, 5),
		db.select({ id: treeElement.id }).from(treeElement).where(eq(treeElement.userId, userId)),
		db.select().from(trainingSession).where(eq(trainingSession.userId, userId)),
		getDueReminders(userId, 10),
		getUpcomingEvents(userId, 7),
		getAnalytics(userId),
		getUserSettings(userId),
		getDashboardNote(userId)
	]);

	const totalDuration = allSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);

	return {
		recentItems,
		recentSessions,
		dueReminders,
		upcomingEvents,
		analytics,
		currency: settings?.currency ?? 'DZD',
		note,
		weeklyTraining: getWeeklyTrainingMinutes(allSessions),
		stats: {
			itemCount: allItems.length,
			sessionCount: allSessions.length,
			totalDuration
		}
	};
}

export async function getUpcomingEvents(userId: string, days = 7) {
	const now = new Date();
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + days);

	// Get upcoming training sessions
	const upcomingSessions = await db
		.select({
			id: trainingSession.id,
			title: trainingSession.title,
			startedAt: trainingSession.startedAt,
			duration: trainingSession.duration
		})
		.from(trainingSession)
		.where(
			and(
				eq(trainingSession.userId, userId),
				gte(trainingSession.startedAt, now),
				lte(trainingSession.startedAt, endDate)
			)
		)
		.orderBy(desc(trainingSession.startedAt))
		.limit(10)
		.all();

	// Get upcoming reminders
	const upcomingReminders = await getUpcomingReminders(userId, days, 10);

	// Combine and format as events
	const events = [
		...upcomingSessions.map((s) => ({
			type: 'training' as const,
			id: s.id,
			title: s.title || 'Training Session',
			date: s.startedAt,
			duration: s.duration
		})),
		...upcomingReminders.map((r) => ({
			type: 'reminder' as const,
			id: r.id,
			title: r.title,
			date: r.dueAt,
			completed: r.completed
		}))
	].sort((a, b) => a.date.getTime() - b.date.getTime());

	return events;
}

// ─── Dashboard Note ──────────────────────────────────────────────────────────

export async function getDashboardNote(userId: string): Promise<string> {
	const row = await db
		.select({ content: dashboardNote.content })
		.from(dashboardNote)
		.where(eq(dashboardNote.userId, userId))
		.get();
	return row?.content ?? '';
}

export async function saveDashboardNote(userId: string, content: string): Promise<void> {
	const existing = await db
		.select({ id: dashboardNote.id })
		.from(dashboardNote)
		.where(eq(dashboardNote.userId, userId))
		.get();

	if (existing) {
		await db.update(dashboardNote).set({ content }).where(eq(dashboardNote.id, existing.id));
	} else {
		await db.insert(dashboardNote).values({ userId, content });
	}
}
