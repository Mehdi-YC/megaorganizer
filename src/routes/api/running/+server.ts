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

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const activityId = url.searchParams.get('activityId');
	const history = url.searchParams.get('history');

	if (history === 'true') {
		const runs = await getRunningHistory(locals.user.id);
		return json(runs);
	}

	if (activityId) {
		const activity = await getRunningActivity(activityId);
		if (!activity) {
			return json({ error: 'Activity not found' }, { status: 404 });
		}
		return json(activity);
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
