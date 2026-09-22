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
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isNumber,
	isArray,
	hasFields
} from '$lib/server/validate';
import { db } from '$lib/server/db';

const MAX_GPS_POINTS = 10000;

const runMetrics = {
	distance: { validate: isNumber, required: false },
	elapsedDuration: { validate: isNumber, required: false },
	movingDuration: { validate: isNumber, required: false },
	averageSpeed: { validate: isNumber, required: false },
	maxSpeed: { validate: isNumber, required: false },
	averagePace: { validate: isNumber, required: false },
	bestPace: { validate: isNumber, required: false },
	elevationGain: { validate: isNumber, required: false },
	elevationLoss: { validate: isNumber, required: false }
} as const;

type GpsPointInput = {
	latitude: number;
	longitude: number;
	altitude?: number;
	accuracy?: number;
	speed?: number;
	heading?: number;
	sequence?: number;
	timestamp: string | number | Date;
};

function isGpsPoint(p: unknown): p is GpsPointInput {
	return (
		hasFields(p) &&
		typeof p.latitude === 'number' &&
		typeof p.longitude === 'number' &&
		'timestamp' in p &&
		p.timestamp !== null
	);
}

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
				activityId: { validate: isNonEmptyString, label: 'Activity ID' },
				...runMetrics
			});
			if (!v.ok) return v.error;
			const activity = await createRunningActivity(user.id, v.data.activityId, v.data);
			if (!activity) return json({ error: 'Activity not found or access denied' }, { status: 404 });
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
					validate: isArray(
						(p): p is Record<string, unknown> =>
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
			const v = validateBody(body, {
				title: { validate: isString, required: false },
				notes: { validate: isString, required: false },
				...runMetrics,
				gpsPoints: {
					validate: isArray(isGpsPoint),
					required: false,
					label: 'GPS points'
				}
			});
			if (!v.ok) return v.error;

			const gpsPoints = (v.data.gpsPoints ?? []) as GpsPointInput[];
			if (gpsPoints.length > MAX_GPS_POINTS) {
				return json({ error: `Too many GPS points (max ${MAX_GPS_POINTS})` }, { status: 400 });
			}

			const timestamps = gpsPoints.map((p) => new Date(p.timestamp));
			if (timestamps.some((t) => Number.isNaN(t.getTime()))) {
				return json({ error: 'GPS points contain invalid timestamps' }, { status: 400 });
			}

			const title =
				typeof v.data.title === 'string' && v.data.title.trim()
					? v.data.title.trim()
					: `Run - ${new Date().toLocaleDateString()}`;
			const startedAt = gpsPoints.length > 0 ? timestamps[0] : new Date();
			const endedAt = gpsPoints.length > 0 ? timestamps[timestamps.length - 1] : new Date();

			try {
				const result = await db.transaction(async (tx) => {
					const session = await createTrainingSession(
						user.id,
						{ title, notes: v.data.notes, startedAt },
						tx
					);
					const activity = await createTrainingActivity(
						user.id,
						session.id,
						{ type: 'running', startedAt },
						tx
					);
					if (!activity) throw new Error('Failed to create activity');

					await createRunningActivity(
						user.id,
						activity.id,
						{
							distance: v.data.distance,
							elapsedDuration: v.data.elapsedDuration,
							movingDuration: v.data.movingDuration,
							averageSpeed: v.data.averageSpeed,
							maxSpeed: v.data.maxSpeed,
							averagePace: v.data.averagePace,
							bestPace: v.data.bestPace,
							elevationGain: v.data.elevationGain,
							elevationLoss: v.data.elevationLoss
						},
						tx
					);

					if (gpsPoints.length > 0) {
						await batchAddTrackPoints(
							user.id,
							activity.id,
							gpsPoints.map((p, i) => ({
								sequence: typeof p.sequence === 'number' ? p.sequence : i,
								timestamp: new Date(p.timestamp),
								latitude: p.latitude,
								longitude: p.longitude,
								altitude: p.altitude,
								accuracy: p.accuracy,
								speed: p.speed,
								heading: p.heading
							})),
							tx
						);
					}

					await updateTrainingSession(
						user.id,
						session.id,
						{ status: 'completed', endedAt, duration: v.data.elapsedDuration },
						tx
					);

					return { sessionId: session.id, activityId: activity.id };
				});
				return json(result, { status: 201 });
			} catch (e) {
				console.error('saveRun failed:', e);
				return json({ error: 'Failed to save run. Please try again.' }, { status: 500 });
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
