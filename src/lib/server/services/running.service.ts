import { db } from '$lib/server/db';
import { runningActivity, runningTrackPoint, trainingActivity, trainingSession } from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

async function verifyActivityOwnership(userId: string, activityId: string): Promise<boolean> {
	const activity = await db
		.select({ sessionId: trainingActivity.sessionId })
		.from(trainingActivity)
		.where(eq(trainingActivity.id, activityId))
		.get();
	if (!activity) return false;

	const session = await db
		.select({ id: trainingSession.id })
		.from(trainingSession)
		.where(and(eq(trainingSession.id, activity.sessionId), eq(trainingSession.userId, userId)))
		.get();
	return !!session;
}

export async function createRunningActivity(
	activityId: string,
	data: {
		distance?: number;
		elapsedDuration?: number;
		movingDuration?: number;
		averageSpeed?: number;
		maxSpeed?: number;
		averagePace?: number;
		bestPace?: number;
		elevationGain?: number;
		elevationLoss?: number;
	}
) {
	const [result] = await db
		.insert(runningActivity)
		.values({
			activityId,
			...data
		})
		.returning();

	return result;
}

export async function updateRunningActivity(
	userId: string,
	activityId: string,
	data: {
		distance?: number;
		elapsedDuration?: number;
		movingDuration?: number;
		averageSpeed?: number;
		maxSpeed?: number;
		averagePace?: number;
		bestPace?: number;
		elevationGain?: number;
		elevationLoss?: number;
	}
) {
	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return null;

	const [result] = await db
		.update(runningActivity)
		.set(data)
		.where(eq(runningActivity.activityId, activityId))
		.returning();

	return result;
}

export async function getRunningActivity(userId: string, activityId: string) {
	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return null;

	return db
		.select()
		.from(runningActivity)
		.where(eq(runningActivity.activityId, activityId))
		.get();
}

export async function addTrackPoint(
	userId: string,
	activityId: string,
	data: {
		sequence: number;
		timestamp: Date;
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		heading?: number;
	}
) {
	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return null;

	const [result] = await db
		.insert(runningTrackPoint)
		.values({
			activityId,
			...data,
			timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp)
		})
		.returning();

	return result;
}

export async function batchAddTrackPoints(
	userId: string,
	activityId: string,
	points: Array<{
		sequence: number;
		timestamp: Date;
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		heading?: number;
	}>
) {
	if (points.length === 0) return [];

	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return [];

	const values = points.map((p) => ({
		activityId,
		...p,
		timestamp: p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp)
	}));

	return db.insert(runningTrackPoint).values(values).returning().all();
}

export async function getTrackPoints(userId: string, activityId: string) {
	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return [];

	return db
		.select()
		.from(runningTrackPoint)
		.where(eq(runningTrackPoint.activityId, activityId))
		.orderBy(asc(runningTrackPoint.sequence))
		.all();
}

export async function deleteTrackPoints(userId: string, activityId: string) {
	const owned = await verifyActivityOwnership(userId, activityId);
	if (!owned) return;

	await db
		.delete(runningTrackPoint)
		.where(eq(runningTrackPoint.activityId, activityId));
}

export async function getRunningHistory(userId: string, limit = 20) {
	return db
		.select({
			activityId: runningActivity.activityId,
			distance: runningActivity.distance,
			elapsedDuration: runningActivity.elapsedDuration,
			averagePace: runningActivity.averagePace,
			startedAt: trainingActivity.startedAt
		})
		.from(runningActivity)
		.innerJoin(
			trainingActivity,
			eq(runningActivity.activityId, trainingActivity.id)
		)
		.innerJoin(
			trainingSession,
			eq(trainingActivity.sessionId, trainingSession.id)
		)
		.where(eq(trainingSession.userId, userId))
		.orderBy(desc(trainingActivity.startedAt))
		.limit(limit)
		.all();
}
