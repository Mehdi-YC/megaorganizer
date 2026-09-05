import { db } from '$lib/server/db';
import {
	trainingSession,
	trainingActivity,
	trainingActivityItem,
	trainingExerciseRecord
} from '$lib/server/db/schema';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';

export async function createTrainingSession(
	userId: string,
	data: {
		title?: string;
		notes?: string;
		startedAt?: Date;
		sourcePageId?: string;
		sourceNodeId?: string;
	}
) {
	const [result] = await db
		.insert(trainingSession)
		.values({
			userId,
			title: data.title,
			notes: data.notes,
			startedAt: data.startedAt ?? new Date(),
			sourcePageId: data.sourcePageId,
			sourceNodeId: data.sourceNodeId
		})
		.returning();

	return result;
}

export async function getTrainingSessions(userId: string, limit = 50) {
	return db
		.select()
		.from(trainingSession)
		.where(eq(trainingSession.userId, userId))
		.orderBy(desc(trainingSession.startedAt))
		.limit(limit)
		.all();
}

export async function getTrainingSessionsWithActivities(userId: string, limit = 50) {
	const sessions = await getTrainingSessions(userId, limit);
	if (sessions.length === 0) return [];

	const sessionIds = sessions.map((s) => s.id);
	const allActivities = await db
		.select()
		.from(trainingActivity)
		.where(inArray(trainingActivity.sessionId, sessionIds))
		.all();

	const activitiesBySession = new Map<string, string[]>();
	for (const act of allActivities) {
		if (!sessionIds.includes(act.sessionId)) continue;
		const types = activitiesBySession.get(act.sessionId) ?? [];
		if (!types.includes(act.type)) types.push(act.type);
		activitiesBySession.set(act.sessionId, types);
	}

	return sessions.map((s) => ({
		...s,
		activityTypes: activitiesBySession.get(s.id) ?? []
	}));
}

export async function getTrainingSessionById(userId: string, sessionId: string) {
	return db
		.select()
		.from(trainingSession)
		.where(
			and(eq(trainingSession.id, sessionId), eq(trainingSession.userId, userId))
		)
		.get();
}

export async function updateTrainingSession(
	userId: string,
	sessionId: string,
	data: {
		title?: string;
		notes?: string;
		status?: 'active' | 'paused' | 'completed' | 'cancelled';
		endedAt?: Date;
		duration?: number;
	}
) {
	const [result] = await db
		.update(trainingSession)
		.set(data)
		.where(and(eq(trainingSession.id, sessionId), eq(trainingSession.userId, userId)))
		.returning();

	return result;
}

export async function deleteTrainingSession(userId: string, sessionId: string) {
	await db
		.delete(trainingSession)
		.where(and(eq(trainingSession.id, sessionId), eq(trainingSession.userId, userId)));
}

export async function verifySessionOwnership(userId: string, sessionId: string): Promise<boolean> {
	const session = await db
		.select({ id: trainingSession.id })
		.from(trainingSession)
		.where(and(eq(trainingSession.id, sessionId), eq(trainingSession.userId, userId)))
		.get();
	return !!session;
}

export async function createTrainingActivity(
	userId: string,
	sessionId: string,
	data: {
		type: 'strength' | 'running' | 'cycling' | 'walking' | 'swimming' | 'other';
		startedAt?: Date;
		notes?: string;
	}
) {
	const owned = await verifySessionOwnership(userId, sessionId);
	if (!owned) return null;

	const [result] = await db
		.insert(trainingActivity)
		.values({
			sessionId,
			type: data.type,
			startedAt: data.startedAt ?? new Date(),
			notes: data.notes
		})
		.returning();

	return result;
}

export async function getTrainingActivities(sessionId: string) {
	return db
		.select()
		.from(trainingActivity)
		.where(eq(trainingActivity.sessionId, sessionId))
		.orderBy(asc(trainingActivity.startedAt))
		.all();
}

export async function updateTrainingActivity(
	userId: string,
	activityId: string,
	data: {
		endedAt?: Date;
		notes?: string;
	}
) {
	const activity = await db
		.select({ sessionId: trainingActivity.sessionId })
		.from(trainingActivity)
		.where(eq(trainingActivity.id, activityId))
		.get();
	if (!activity) return null;

	const owned = await verifySessionOwnership(userId, activity.sessionId);
	if (!owned) return null;

	const [result] = await db
		.update(trainingActivity)
		.set(data)
		.where(eq(trainingActivity.id, activityId))
		.returning();

	return result;
}

export async function linkItemToActivity(activityId: string, itemId: string) {
	const [result] = await db
		.insert(trainingActivityItem)
		.values({ activityId, itemId })
		.returning();

	return result;
}

export async function unlinkItemFromActivity(activityId: string, itemId: string) {
	await db
		.delete(trainingActivityItem)
		.where(
			and(
				eq(trainingActivityItem.activityId, activityId),
				eq(trainingActivityItem.itemId, itemId)
			)
		);
}

export async function getActivityItems(activityId: string) {
	return db
		.select()
		.from(trainingActivityItem)
		.where(eq(trainingActivityItem.activityId, activityId))
		.all();
}

export async function createExerciseRecord(
	userId: string,
	activityId: string,
	itemId: string,
	data: {
		sets?: number;
		reps?: string;
		weight?: number;
		unit?: string;
		rpe?: number;
		restTime?: number;
		notes?: string;
		position?: number;
	}
) {
	const activity = await db
		.select({ sessionId: trainingActivity.sessionId })
		.from(trainingActivity)
		.where(eq(trainingActivity.id, activityId))
		.get();
	if (!activity) return null;

	const owned = await verifySessionOwnership(userId, activity.sessionId);
	if (!owned) return null;

	const [result] = await db
		.insert(trainingExerciseRecord)
		.values({
			activityId,
			itemId,
			...data
		})
		.returning();

	return result;
}

export async function getExerciseRecords(activityId: string) {
	return db
		.select()
		.from(trainingExerciseRecord)
		.where(eq(trainingExerciseRecord.activityId, activityId))
		.orderBy(asc(trainingExerciseRecord.position))
		.all();
}

export async function updateExerciseRecord(
	userId: string,
	recordId: string,
	data: {
		sets?: number;
		reps?: string;
		weight?: number;
		unit?: string;
		rpe?: number;
		restTime?: number;
		notes?: string;
	}
) {
	const record = await db
		.select({ activityId: trainingExerciseRecord.activityId })
		.from(trainingExerciseRecord)
		.where(eq(trainingExerciseRecord.id, recordId))
		.get();
	if (!record) return null;

	const activity = await db
		.select({ sessionId: trainingActivity.sessionId })
		.from(trainingActivity)
		.where(eq(trainingActivity.id, record.activityId))
		.get();
	if (!activity) return null;

	const owned = await verifySessionOwnership(userId, activity.sessionId);
	if (!owned) return null;

	const [result] = await db
		.update(trainingExerciseRecord)
		.set(data)
		.where(eq(trainingExerciseRecord.id, recordId))
		.returning();

	return result;
}

export async function deleteExerciseRecord(
	userId: string,
	recordId: string
) {
	const record = await db
		.select({ activityId: trainingExerciseRecord.activityId })
		.from(trainingExerciseRecord)
		.where(eq(trainingExerciseRecord.id, recordId))
		.get();
	if (!record) return;

	const activity = await db
		.select({ sessionId: trainingActivity.sessionId })
		.from(trainingActivity)
		.where(eq(trainingActivity.id, record.activityId))
		.get();
	if (!activity) return;

	const owned = await verifySessionOwnership(userId, activity.sessionId);
	if (!owned) return;

	await db.delete(trainingExerciseRecord).where(eq(trainingExerciseRecord.id, recordId));
}
