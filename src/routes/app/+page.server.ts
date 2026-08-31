import { db } from '$lib/server/db';
import { treeElement, trainingSession } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTrainingSessionsWithActivities } from '$lib/server/services/training.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { recentItems: [], recentSessions: [], stats: { itemCount: 0, sessionCount: 0, totalDuration: 0 } };

	const userId = locals.user.id;

	const recentItems = await db
		.select({ id: treeElement.id, name: treeElement.name, type: treeElement.type, imageUrl: treeElement.imageUrl, updatedAt: treeElement.updatedAt })
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.orderBy(desc(treeElement.updatedAt))
		.limit(6);

	const recentSessions = await getTrainingSessionsWithActivities(userId, 5);

	const allItems = await db.select({ id: treeElement.id }).from(treeElement).where(eq(treeElement.userId, userId));
	const allSessions = await db.select().from(trainingSession).where(eq(trainingSession.userId, userId));
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
};
