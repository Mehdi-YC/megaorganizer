import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createRunningActivity,
	updateRunningActivity,
	getRunningActivity,
	addTrackPoint,
	batchAddTrackPoints,
	getTrackPoints,
	deleteTrackPoints,
	getRunningHistory
} from '$lib/server/services/running.service';
import {
	createTrainingSession,
	createTrainingActivity,
	updateTrainingSession,
	getTrainingActivities
} from '$lib/server/services/training.service';
import { requireUser } from '$lib/server/api-helpers';

const MAX_GPS_POINTS = 10000;

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);

	const sessionId = event.url.searchParams.get('sessionId');
	const activityId = event.url.searchParams.get('activityId');
	const history = event.url.searchParams.get('history');

	if (history === 'true') {
		const runs = await getRunningHistory(user.id);
		return json(runs);
	}

	if (sessionId) {
		const activities = await getTrainingActivities(sessionId);
		const allTrackPoints: any[] = [];
		for (const act of activities) {
			const runningAct = await getRunningActivity(act.id);
			if (runningAct) {
				const points = await getTrackPoints(act.id);
				allTrackPoints.push({
					activityId: act.id,
					runningActivity: runningAct,
					trackPoints: points
				});
			}
		}
		return json(allTrackPoints);
	}

	if (activityId) {
		const activity = await getRunningActivity(activityId);
		if (!activity) {
			return json({ error: 'Activity not found' }, { status: 404 });
		}
		const points = await getTrackPoints(activityId);
		return json({ activity, trackPoints: points });
	}

	return json({ error: 'Invalid parameters' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'create') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		const activity = await createRunningActivity(data.activityId, data);
		return json(activity, { status: 201 });
	}

	if (data.action === 'addTrackPoint') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		const point = await addTrackPoint(data.activityId, data);
		return json(point, { status: 201 });
	}

	if (data.action === 'batchAddTrackPoints') {
		if (!data.activityId || !Array.isArray(data.points)) {
			return json({ error: 'Activity ID and points array are required' }, { status: 400 });
		}
		if (data.points.length > MAX_GPS_POINTS) {
			return json({ error: `Too many GPS points (max ${MAX_GPS_POINTS})` }, { status: 400 });
		}
		const points = await batchAddTrackPoints(data.activityId, data.points);
		return json(points, { status: 201 });
	}

	if (data.action === 'getTrackPoints') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		const points = await getTrackPoints(data.activityId);
		return json(points);
	}

	if (data.action === 'saveRun') {
		if (data.gpsPoints && data.gpsPoints.length > MAX_GPS_POINTS) {
			return json({ error: `Too many GPS points (max ${MAX_GPS_POINTS})` }, { status: 400 });
		}

		const session = await createTrainingSession(user.id, {
			title: `Run - ${new Date().toLocaleDateString()}`,
			startedAt: data.gpsPoints?.length > 0 ? new Date(data.gpsPoints[0].timestamp) : new Date()
		});

		const activity = await createTrainingActivity(user.id, session.id, {
			type: 'running',
			startedAt: data.gpsPoints?.length > 0 ? new Date(data.gpsPoints[0].timestamp) : new Date()
		});

		if (!activity) {
			return json({ error: 'Failed to create activity' }, { status: 500 });
		}

		await createRunningActivity(activity.id, {
			distance: data.distance,
			elapsedDuration: data.elapsedDuration,
			averageSpeed: data.averageSpeed,
			maxSpeed: data.maxSpeed,
			averagePace: data.averagePace,
			bestPace: data.bestPace
		});

		if (data.gpsPoints && data.gpsPoints.length > 0) {
			await batchAddTrackPoints(activity.id, data.gpsPoints);
		}

		await updateTrainingSession(user.id, session.id, {
			status: 'completed',
			endedAt: data.gpsPoints?.length > 0 ? new Date(data.gpsPoints[data.gpsPoints.length - 1].timestamp) : new Date(),
			duration: data.elapsedDuration
		});

		return json({ sessionId: session.id, activityId: activity.id }, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'update') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		const activity = await updateRunningActivity(data.activityId, data);
		return json(activity);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await event.request.json();

	if (data.action === 'deleteTrackPoints') {
		if (!data.activityId) {
			return json({ error: 'Activity ID is required' }, { status: 400 });
		}
		await deleteTrackPoints(data.activityId);
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
