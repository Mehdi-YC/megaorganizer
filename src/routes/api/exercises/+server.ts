import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listExercises,
	createExercise,
	updateExercise,
	deleteExercise,
	getPersonalRecords,
	MUSCLE_GROUPS
} from '$lib/server/services/exercise.service';
import { requireUser } from '$lib/server/api-helpers';
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isOneOf,
	isArray
} from '$lib/server/validate';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const search = event.url.searchParams.get('search') || undefined;
	const muscleGroup = event.url.searchParams.get('muscleGroup') || undefined;
	const withPr = event.url.searchParams.get('pr') === '1';

	const exercises = await listExercises(user.id, { search, muscleGroup });
	if (!withPr) return json(exercises);

	const prs = await getPersonalRecords(
		user.id,
		exercises.map((e) => e.id)
	);
	return json(exercises.map((e) => ({ ...e, pr: prs.get(e.id) ?? null })));
};

const muscleGroups = MUSCLE_GROUPS;

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		name: { validate: isNonEmptyString, label: 'Name' },
		muscleGroup: { validate: isOneOf(muscleGroups), required: false },
		secondaryMuscles: { validate: isArray(isString), required: false },
		equipment: { validate: isString, required: false },
		description: { validate: isString, required: false },
		imageUrls: { validate: isArray(isString), required: false }
	});
	if (!v.ok) return v.error;

	const exercise = await createExercise(user.id, v.data);
	return json(exercise, { status: 201 });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const v = validateBody(body, {
		id: { validate: isNonEmptyString, label: 'Exercise ID' },
		name: { validate: isNonEmptyString, required: false },
		muscleGroup: { validate: isOneOf(muscleGroups), required: false },
		secondaryMuscles: { validate: isArray(isString), required: false },
		equipment: { validate: isString, required: false },
		description: { validate: isString, required: false },
		imageUrls: { validate: isArray(isString), required: false }
	});
	if (!v.ok) return v.error;

	const { id, ...data } = v.data;
	const exercise = await updateExercise(user.id, id, data);
	if (!exercise) return json({ error: 'Exercise not found' }, { status: 404 });
	return json(exercise);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const id = event.url.searchParams.get('id');
	if (!id) return json({ error: 'id required' }, { status: 400 });

	const deleted = await deleteExercise(user.id, id);
	if (!deleted) return json({ error: 'Exercise not found' }, { status: 404 });
	return json({ success: true });
};
