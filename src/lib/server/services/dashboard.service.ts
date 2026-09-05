import { db } from '$lib/server/db';
import { treeElement, trainingSession } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTrainingSessionsWithActivities } from './training.service';

export async function getDashboardData(userId: string) {
	const [recentItems, recentSessions, allItems, allSessions] = await Promise.all([
		db
			.select({
				id: treeElement.id,
				name: treeElement.name,
				type: treeElement.type,
				imageUrl: treeElement.imageUrl,
				updatedAt: treeElement.updatedAt
			})
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
			.orderBy(desc(treeElement.updatedAt))
			.limit(6),
		getTrainingSessionsWithActivities(userId, 5),
		db.select({ id: treeElement.id }).from(treeElement).where(eq(treeElement.userId, userId)),
		db.select().from(trainingSession).where(eq(trainingSession.userId, userId))
	]);

	const totalDuration = allSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);

	return {
		recentItems,
		recentSessions,
		stats: {
			itemCount: allItems.length,
			sessionCount: allSessions.length,
			totalDuration
		}
	};
}
