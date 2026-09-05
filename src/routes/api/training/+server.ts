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
	updateExerciseRecord,
	deleteExerciseRecord
} from '$lib/server/services/training.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);

	const sessionId = event.url.searchParams.get('sessionId');
	const activityId = event.url.searchParams.get('activityId');

	if (sessionId) {
		const session = await getTrainingSessionById(user.id, sessionId);
		if (!session) {
			return json({ error: 'Session not found' }, { status: 404 });
		}
		return json(session);
	}

	if (activityId) {
		const items = await getActivityItems(activityId);
		return json(items);
	}

	const sessions = await getTrainingSessions(user.id);
	return json(sessions);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'createSession') {
		const session = await createTrainingSession(user.id, data);
		return json(session, { status: 201 });
	}

	if (data.action === 'createActivity') {
		if (!data.sessionId || !data.type) {
			return json({ error: 'Session ID and type are required' }, { status: 400 });
		}
		const activity = await createTrainingActivity(user.id, data.sessionId, data);
		if (!activity) {
			return json({ error: 'Session not found or access denied' }, { status: 404 });
		}
		return json(activity, { status: 201 });
	}

	if (data.action === 'linkItem') {
		if (!data.activityId || !data.itemId) {
			return json({ error: 'Activity ID and Item ID are required' }, { status: 400 });
		}
		await linkItemToActivity(data.activityId, data.itemId);
		return json({ success: true }, { status: 201 });
	}

	if (data.action === 'createExerciseRecord') {
		if (!data.activityId || !data.itemId) {
			return json({ error: 'Activity ID and Item ID are required' }, { status: 400 });
		}
		const record = await createExerciseRecord(user.id, data.activityId, data.itemId, data);
		if (!record) {
			return json({ error: 'Activity not found or access denied' }, { status: 404 });
		}
		return json(record, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'updateSession') {
		if (!data.sessionId) {
			return json({ error: 'Session ID is required' }, { status: 400 });
		}
		const session = await updateTrainingSession(user.id, data.sessionId, data);
		return json(session);
	}

	if (data.action === 'updateActivity') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		const activity = await updateTrainingActivity(user.id, data.activityId, data);
		return json(activity);
	}

	if (data.action === 'updateExerciseRecord') {
		if (!data.recordId) {
			return json({ error: 'Record ID is required' }, { status: 400 });
		}
		const record = await updateExerciseRecord(user.id, data.recordId, data);
		return json(record);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'deleteSession') {
		if (!data.sessionId) {
			return json({ error: 'Session ID is required' }, { status: 400 });
		}
		await deleteTrainingSession(user.id, data.sessionId);
		return json({ success: true });
	}

	if (data.action === 'unlinkItem') {
		if (!data.activityId || !data.itemId) {
			return json({ error: 'Activity ID and Item ID are required' }, { status: 400 });
		}
		await unlinkItemFromActivity(data.activityId, data.itemId);
		return json({ success: true });
	}

	if (data.action === 'deleteExerciseRecord') {
		if (!data.recordId) {
			return json({ error: 'Record ID is required' }, { status: 400 });
		}
		await deleteExerciseRecord(user.id, data.recordId);
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
