import { db } from '$lib/server/db';
import {
	trainingSession,
	trainingActivity,
	trainingActivityItem,
	trainingExerciseRecord
} from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

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
		.where(eq(trainingSession.id, sessionId))
		.returning();

	return result;
}

export async function deleteTrainingSession(sessionId: string) {
	await db.delete(trainingSession).where(eq(trainingSession.id, sessionId));
}

export async function createTrainingActivity(
	sessionId: string,
	data: {
		type: 'strength' | 'running' | 'cycling' | 'walking' | 'swimming' | 'other';
		startedAt?: Date;
		notes?: string;
	}
) {
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
	activityId: string,
	data: {
		endedAt?: Date;
		notes?: string;
	}
) {
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
	const [result] = await db
		.update(trainingExerciseRecord)
		.set(data)
		.where(eq(trainingExerciseRecord.id, recordId))
		.returning();

	return result;
}

export async function deleteExerciseRecord(recordId: string) {
	await db.delete(trainingExerciseRecord).where(eq(trainingExerciseRecord.id, recordId));
}
