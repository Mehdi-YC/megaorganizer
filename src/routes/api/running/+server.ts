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
import { parseJson, validateBody, isString, isNonEmptyString, isNumber, isArray, hasFields } from '$lib/server/validate';

const MAX_GPS_POINTS = 10000;

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);

	const sessionId = event.url.searchParams.get('sessionId');
	const activityId = event.url.searchParams.get('activityId');
	const history = event.url.searchParams.get('history');

	if (history === 'true') {
		return json(await getRunningHistory(user.id));
	}

	if (sessionId) {
		const activities = await getTrainingActivities(user.id, sessionId);
		const allTrackPoints: any[] = [];
		for (const act of activities) {
			const runningAct = await getRunningActivity(user.id, act.id);
			if (runningAct) {
				const points = await getTrackPoints(user.id, act.id);
				allTrackPoints.push({ activityId: act.id, runningActivity: runningAct, trackPoints: points });
			}
		}
		return json(allTrackPoints);
	}

	if (activityId) {
		const activity = await getRunningActivity(user.id, activityId);
		if (!activity) return json({ error: 'Activity not found' }, { status: 404 });
		const points = await getTrackPoints(user.id, activityId);
		return json({ activity, trackPoints: points });
	}

	return json({ error: 'Invalid parameters' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'create': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' }
			});
			if (!v.ok) return v.error;
			const activity = await createRunningActivity(v.data.activityId, body as any);
			return json(activity, { status: 201 });
		}

		case 'addTrackPoint': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				sequence: { validate: isNumber, label: 'Sequence' },
				latitude: { validate: isNumber, label: 'Latitude' },
				longitude: { validate: isNumber, label: 'Longitude' }
			});
			if (!v.ok) return v.error;
			const point = await addTrackPoint(user.id, v.data.activityId, body as any);
			if (!point) return json({ error: 'Activity not found or access denied' }, { status: 404 });
			return json(point, { status: 201 });
		}

		case 'batchAddTrackPoints': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				points: {
					validate: isArray((p): p is Record<string, unknown> =>
						hasFields(p) && typeof p.latitude === 'number' && typeof p.longitude === 'number'
					),
					label: 'Points'
				}
			});
			if (!v.ok) return v.error;
			if (v.data.points.length > MAX_GPS_POINTS) {
				return json({ error: `Too many GPS points (max ${MAX_GPS_POINTS})` }, { status: 400 });
			}
			const points = await batchAddTrackPoints(user.id, v.data.activityId, v.data.points as any);
			return json(points, { status: 201 });
		}

		case 'getTrackPoints': {
			const v = validateBody(body, {
				activityId: { validate: isNonEmptyString, label: 'Activity ID' }
			});
			if (!v.ok) return v.error;
			return json(await getTrackPoints(user.id, v.data.activityId));
		}

		case 'saveRun': {
			const gpsPoints = body.gpsPoints;
			if (Array.isArray(gpsPoints) && gpsPoints.length > MAX_GPS_POINTS) {
				return json({ error: `Too many GPS points (max ${MAX_GPS_POINTS})` }, { status: 400 });
			}

			const title = typeof body.title === 'string' && body.title.trim()
				? body.title.trim()
				: `Run - ${new Date().toLocaleDateString()}`;

			const session = await createTrainingSession(user.id, {
				title,
				startedAt: Array.isArray(gpsPoints) && gpsPoints.length > 0
					? new Date((gpsPoints[0] as any).timestamp)
					: new Date()
			});

			const activity = await createTrainingActivity(user.id, session.id, {
				type: 'running',
				startedAt: Array.isArray(gpsPoints) && gpsPoints.length > 0
					? new Date((gpsPoints[0] as any).timestamp)
					: new Date()
			});

			if (!activity) return json({ error: 'Failed to create activity' }, { status: 500 });

			await createRunningActivity(activity.id, {
				distance: body.distance as number | undefined,
				elapsedDuration: body.elapsedDuration as number | undefined,
				averageSpeed: body.averageSpeed as number | undefined,
				maxSpeed: body.maxSpeed as number | undefined,
				averagePace: body.averagePace as number | undefined,
				bestPace: body.bestPace as number | undefined
			});

			if (Array.isArray(gpsPoints) && gpsPoints.length > 0) {
				await batchAddTrackPoints(user.id, activity.id, gpsPoints as any);
			}

			const lastTimestamp = Array.isArray(gpsPoints) && gpsPoints.length > 0
				? new Date((gpsPoints[gpsPoints.length - 1] as any).timestamp)
				: new Date();

			await updateTrainingSession(user.id, session.id, {
				status: 'completed',
				endedAt: lastTimestamp,
				duration: body.elapsedDuration as number | undefined
			});

			return json({ sessionId: session.id, activityId: activity.id }, { status: 201 });
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

	if (body.action === 'update') {
		const v = validateBody(body, {
			activityId: { validate: isNonEmptyString, label: 'Activity ID' }
		});
		if (!v.ok) return v.error;
		const activity = await updateRunningActivity(user.id, v.data.activityId, body as any);
		if (!activity) return json({ error: 'Activity not found or access denied' }, { status: 404 });
		return json(activity);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	if (body.action === 'deleteTrackPoints') {
		const v = validateBody(body, {
			activityId: { validate: isNonEmptyString, label: 'Activity ID' }
		});
		if (!v.ok) return v.error;
		await deleteTrackPoints(user.id, v.data.activityId);
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
