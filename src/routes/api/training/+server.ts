import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createTrainingSession,
	getTrainingSessions,
	getTrainingSessionById,
	updateTrainingSession,
	deleteTrainingSession,
	createTrainingActivity,
	getTrainingActivities,
	updateTrainingActivity,
	linkItemToActivity,
	unlinkItemFromActivity,
	getActivityItems,
	createExerciseRecord,
	getExerciseRecords,
	updateExerciseRecord,
	deleteExerciseRecord
} from '$lib/server/services/training.service';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sessionId = url.searchParams.get('sessionId');
	const activityId = url.searchParams.get('activityId');

	if (sessionId) {
		const session = await getTrainingSessionById(locals.user.id, sessionId);
		if (!session) {
			return json({ error: 'Session not found' }, { status: 404 });
		}
		return json(session);
	}

	if (activityId) {
		const items = await getActivityItems(activityId);
		return json(items);
	}

	const sessions = await getTrainingSessions(locals.user.id);
	return json(sessions);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'createSession') {
		const session = await createTrainingSession(locals.user.id, data);
		return json(session, { status: 201 });
	}

	if (data.action === 'createActivity') {
		const activity = await createTrainingActivity(data.sessionId, data);
		return json(activity, { status: 201 });
	}

	if (data.action === 'linkItem') {
		await linkItemToActivity(data.activityId, data.itemId);
		return json({ success: true }, { status: 201 });
	}

	if (data.action === 'createExerciseRecord') {
		const record = await createExerciseRecord(data.activityId, data.itemId, data);
		return json(record, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'updateSession') {
		const session = await updateTrainingSession(data.sessionId, data);
		return json(session);
	}

	if (data.action === 'updateActivity') {
		const activity = await updateTrainingActivity(data.activityId, data);
		return json(activity);
	}

	if (data.action === 'updateExerciseRecord') {
		const record = await updateExerciseRecord(data.recordId, data);
		return json(record);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'deleteSession') {
		await deleteTrainingSession(data.sessionId);
		return json({ success: true });
	}

	if (data.action === 'unlinkItem') {
		await unlinkItemFromActivity(data.activityId, data.itemId);
		return json({ success: true });
	}

	if (data.action === 'deleteExerciseRecord') {
		await deleteExerciseRecord(data.recordId);
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
