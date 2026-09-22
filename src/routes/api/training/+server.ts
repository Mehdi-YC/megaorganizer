import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createTrainingSession,
	getTrainingSessions,
	getTrainingSessionById,
	updateTrainingSession,
	deleteTrainingSession,
	createTrainingActivity,
	updateTrainingActivity,
	linkItemToActivity,
	unlinkItemFromActivity,
	getActivityItems,
	createExerciseRecord,
	updateExerciseRecord,
	deleteExerciseRecord,
	batchCreateExerciseRecords
} from '$lib/server/services/training.service';
import { requireUser } from '$lib/server/api-helpers';
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isOneOf,
	isNumber,
	isArray,
	hasFields
} from '$lib/server/validate';
import { db } from '$lib/server/db';

const activityTypes = [
	'strength',
	'running',
	'cycling',
	'walking',
	'swimming',
	'hiit',
	'other'
] as const;
const sessionStatuses = ['active', 'paused', 'completed', 'cancelled'] as const;

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const sessionId = event.url.searchParams.get('sessionId');
	const activityId = event.url.searchParams.get('activityId');

	if (sessionId) {
		const session = await getTrainingSessionById(user.id, sessionId);
		if (!session) return json({ error: 'Session not found' }, { status: 404 });
		return json(session);
	}

	if (activityId) {
		const items = await getActivityItems(user.id, activityId);
		return json(items);
	}

	return json(await getTrainingSessions(user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'createSession': {
			const v = validateBody(body, {
				title: { validate: isString, required: false },
				notes: { validate: isString, required: false },
				startedAt: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			const session = await createTrainingSession(user.id, v.data as any);
			return json(session, { status: 201 });
		}

		case 'createActivity': {
			const v = validateBody(body, {
				sessionId: { validate: isNonEmptyString, label: 'Session ID' },
				type: { validate: isOneOf(activityTypes), label: 'Activity type' },
				startedAt: { validate: isString, required: false },
				notes: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			const activity = await createTrainingActivity(user.id, v.data.sessionId, v.data as any);
			if (!activity) return json({ error: 'Session not found or access denied' }, { status: 404 });
			return json(activity, { status: 201 });
		}

		case 'linkItem': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				itemId: { validate: isNonEmptyString, label: 'Item ID' }
			});
			if (!v.ok) return v.error;
			const result = await linkItemToActivity(user.id, v.data.activityId, v.data.itemId);
			if (!result) return json({ error: 'Activity not found or access denied' }, { status: 404 });
			return json({ success: true }, { status: 201 });
		}

		case 'createExerciseRecord': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				itemId: { validate: isNonEmptyString, label: 'Item ID' },
				sets: { validate: isNumber, required: false },
				reps: { validate: isString, required: false },
				weight: { validate: isNumber, required: false },
				unit: { validate: isString, required: false },
				rpe: { validate: isNumber, required: false },
				restTime: { validate: isNumber, required: false },
				notes: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			const record = await createExerciseRecord(
				user.id,
				v.data.activityId,
				v.data.itemId,
				v.data as any
			);
			if (!record) return json({ error: 'Activity not found or access denied' }, { status: 404 });
			return json(record, { status: 201 });
		}

		case 'batchCreateExerciseRecords': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				records: {
					validate: isArray(
						(r): r is Record<string, unknown> => hasFields(r) && typeof r.itemId === 'string'
					),
					label: 'Records'
				}
			});
			if (!v.ok) return v.error;
			if (v.data.records.length > 50)
				return json({ error: 'Too many records (max 50)' }, { status: 400 });
			const result = await batchCreateExerciseRecords(
				user.id,
				v.data.activityId,
				v.data.records as any
			);
			if (!result) return json({ error: 'Activity not found or access denied' }, { status: 404 });
			return json(result, { status: 201 });
		}

		case 'saveSession': {
			const v = validateBody(body, {
				title: { validate: isString, required: false },
				notes: { validate: isString, required: false },
				activityType: { validate: isOneOf(activityTypes), label: 'Activity type' },
				startedAt: { validate: isString, required: false },
				duration: { validate: isNumber, required: false },
				exerciseRecords: {
					validate: isArray(
						(r): r is Record<string, unknown> => hasFields(r) && typeof r.itemId === 'string'
					),
					required: false,
					label: 'Exercise records'
				}
			});
			if (!v.ok) return v.error;

			const records = (v.data.exerciseRecords ?? []) as Array<{
				itemId: string;
				sets?: number;
				reps?: string;
				weight?: number;
				unit?: string;
				rpe?: number;
				restTime?: number;
				notes?: string;
			}>;
			if (records.length > 50) return json({ error: 'Too many records (max 50)' }, { status: 400 });

			// One transaction: a failure halfway must not leave an orphaned
			// session the client would duplicate on retry.
			try {
				const result = await db.transaction(async (tx) => {
					const session = await createTrainingSession(
						user.id,
						{
							title: v.data.title,
							notes: v.data.notes,
							startedAt: v.data.startedAt
						},
						tx
					);
					const activity = await createTrainingActivity(
						user.id,
						session.id,
						{
							type: v.data.activityType,
							startedAt: v.data.startedAt
						},
						tx
					);
					if (!activity) throw new Error('Failed to create activity');

					if (records.length > 0) {
						const saved = await batchCreateExerciseRecords(user.id, activity.id, records, tx);
						if (!saved) throw new Error('Failed to save exercise records');
					}

					await updateTrainingSession(
						user.id,
						session.id,
						{ status: 'completed', endedAt: new Date(), duration: v.data.duration },
						tx
					);

					return { sessionId: session.id, activityId: activity.id };
				});
				return json(result, { status: 201 });
			} catch (e) {
				console.error('saveSession failed:', e);
				return json({ error: 'Failed to save session. Please try again.' }, { status: 500 });
			}
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'updateSession': {
			const v = validateBody(body, {
				sessionId: { validate: isNonEmptyString, label: 'Session ID' },
				title: { validate: isString, required: false },
				notes: { validate: isString, required: false },
				status: { validate: isOneOf(sessionStatuses), required: false },
				endedAt: { validate: isString, required: false },
				duration: { validate: isNumber, required: false }
			});
			if (!v.ok) return v.error;
			const session = await updateTrainingSession(user.id, v.data.sessionId, v.data as any);
			if (!session) return json({ error: 'Not found' }, { status: 404 });
			return json(session);
		}

		case 'updateActivity': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				notes: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			const activity = await updateTrainingActivity(user.id, v.data.activityId, v.data as any);
			if (!activity) return json({ error: 'Not found' }, { status: 404 });
			return json(activity);
		}

		case 'updateExerciseRecord': {
			const v = validateBody(body, {
				recordId: { validate: isNonEmptyString, label: 'Record ID' },
				sets: { validate: isNumber, required: false },
				reps: { validate: isString, required: false },
				weight: { validate: isNumber, required: false },
				unit: { validate: isString, required: false },
				rpe: { validate: isNumber, required: false },
				restTime: { validate: isNumber, required: false },
				notes: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			const record = await updateExerciseRecord(user.id, v.data.recordId, v.data as any);
			if (!record) return json({ error: 'Not found' }, { status: 404 });
			return json(record);
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'deleteSession': {
			const v = validateBody(body, {
				sessionId: { validate: isNonEmptyString, label: 'Session ID' }
			});
			if (!v.ok) return v.error;
			await deleteTrainingSession(user.id, v.data.sessionId);
			return json({ success: true });
		}

		case 'unlinkItem': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				itemId: { validate: isNonEmptyString, label: 'Item ID' }
			});
			if (!v.ok) return v.error;
			await unlinkItemFromActivity(user.id, v.data.activityId, v.data.itemId);
			return json({ success: true });
		}

		case 'deleteExerciseRecord': {
			const v = validateBody(body, {
				recordId: { validate: isNonEmptyString, label: 'Record ID' }
			});
			if (!v.ok) return v.error;
			await deleteExerciseRecord(user.id, v.data.recordId);
			return json({ success: true });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
