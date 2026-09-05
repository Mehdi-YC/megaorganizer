import type { PageServerLoad } from './$types';
import { getTrainingSessionsWithActivities } from '$lib/server/services/training.service';
import { db } from '$lib/server/db';
import { runningActivity, trainingActivity, trainingSession } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const sessions = await getTrainingSessionsWithActivities(locals.user.id);

	const completedSessions = sessions
		.filter((s) => s.status === 'completed' || (s.duration && s.duration > 0))
		.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

	const runningData = await db
		.select({
			activityId: runningActivity.activityId,
			distance: runningActivity.distance,
			elapsedDuration: runningActivity.elapsedDuration,
			averagePace: runningActivity.averagePace,
			startedAt: trainingActivity.startedAt
		})
		.from(runningActivity)
		.innerJoin(trainingActivity, eq(runningActivity.activityId, trainingActivity.id))
		.innerJoin(trainingSession, eq(trainingActivity.sessionId, trainingSession.id))
		.where(eq(trainingSession.userId, locals.user.id))
		.orderBy(asc(trainingActivity.startedAt));

	return { sessions: completedSessions, runningData };
};
