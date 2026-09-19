import { db } from '$lib/server/db';
import { treeElement, trainingSession } from '$lib/server/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { getTrainingSessionsWithActivities } from './training.service';
import { getDueReminders, generateDueReminders, getUpcomingReminders } from './reminder.service';

export async function getDashboardData(userId: string) {
	// Generate any due reminders first
	await generateDueReminders(userId);

	const [recentItems, recentSessions, allItems, allSessions, dueReminders, upcomingEvents] = await Promise.all([
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
		getUpcomingEvents(userId, 7)
	]);

	const totalDuration = allSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);

	return {
		recentItems,
		recentSessions,
		dueReminders,
		upcomingEvents,
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
