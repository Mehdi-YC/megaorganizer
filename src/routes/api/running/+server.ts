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
	getTrainingActivities
} from '$lib/server/services/training.service';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sessionId = url.searchParams.get('sessionId');
	const activityId = url.searchParams.get('activityId');
	const history = url.searchParams.get('history');

	if (history === 'true') {
		const runs = await getRunningHistory(locals.user.id);
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

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'create') {
		const activity = await createRunningActivity(data.activityId, data);
		return json(activity, { status: 201 });
	}

	if (data.action === 'addTrackPoint') {
		const point = await addTrackPoint(data.activityId, data);
		return json(point, { status: 201 });
	}

	if (data.action === 'batchAddTrackPoints') {
		const points = await batchAddTrackPoints(data.activityId, data.points);
		return json(points, { status: 201 });
	}

	if (data.action === 'getTrackPoints') {
		const points = await getTrackPoints(data.activityId);
		return json(points);
	}

	if (data.action === 'saveRun') {
		const session = await createTrainingSession(locals.user.id, {
			title: `Run - ${new Date().toLocaleDateString()}`,
			startedAt: data.gpsPoints?.length > 0 ? new Date(data.gpsPoints[0].timestamp) : new Date()
		});

		const activity = await createTrainingActivity(session.id, {
			type: 'running',
			startedAt: data.gpsPoints?.length > 0 ? new Date(data.gpsPoints[0].timestamp) : new Date()
		});

		const runningActivity = await createRunningActivity(activity.id, {
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

		await updateRunningActivity(activity.id, {
			distance: data.distance,
			elapsedDuration: data.elapsedDuration,
			averageSpeed: data.averageSpeed,
			maxSpeed: data.maxSpeed,
			averagePace: data.averagePace,
			bestPace: data.bestPace
		});

		return json({ sessionId: session.id, activityId: activity.id }, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'update') {
		const activity = await updateRunningActivity(data.activityId, data);
		return json(activity);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (data.action === 'deleteTrackPoints') {
		await deleteTrackPoints(data.activityId);
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
