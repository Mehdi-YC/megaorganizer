import { db } from '$lib/server/db';
import { runningActivity, runningTrackPoint, trainingActivity } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';

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
		.update(runningActivity)
		.set(data)
		.where(eq(runningActivity.activityId, activityId))
		.returning();

	return result;
}

export async function getRunningActivity(activityId: string) {
	return db
		.select()
		.from(runningActivity)
		.where(eq(runningActivity.activityId, activityId))
		.get();
}

export async function addTrackPoint(
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

	const values = points.map((p) => ({
		activityId,
		...p,
		timestamp: p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp)
	}));

	return db.insert(runningTrackPoint).values(values).returning().all();
}

export async function getTrackPoints(activityId: string) {
	return db
		.select()
		.from(runningTrackPoint)
		.where(eq(runningTrackPoint.activityId, activityId))
		.orderBy(asc(runningTrackPoint.sequence))
		.all();
}

export async function deleteTrackPoints(activityId: string) {
	await db
		.delete(runningTrackPoint)
		.where(eq(runningTrackPoint.activityId, activityId));
}

export async function getRunningHistory(userId: string, limit = 20) {
	return db
		.select()
		.from(runningActivity)
		.innerJoin(
			trainingActivity,
			eq(runningActivity.activityId, trainingActivity.id)
		)
		.orderBy(desc(trainingActivity.startedAt))
		.limit(limit)
		.all();
}
