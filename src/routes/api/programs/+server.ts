import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createProgram,
	getPrograms,
	getProgram,
	updateProgram,
	deleteProgram,
	createBlock,
	updateBlock,
	deleteBlock,
	createEntry,
	updateEntry,
	deleteEntry
} from '$lib/server/services/program.service';
import { requireUser } from '$lib/server/api-helpers';
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isNumber,
	isBoolean,
	isOneOf,
	isArray
} from '$lib/server/validate';

const entryKinds = ['title', 'exercise'] as const;

function isWeekdays(v: unknown): v is number[] {
	return (
		isArray(isNumber)(v) && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 6) && v.length <= 7
	);
}

/** Entry fields are nullable so a cleared input actually clears the column. */
const isNumberOrNull = (v: unknown): v is number | null => v === null || isNumber(v);
const isStringOrNull = (v: unknown): v is string | null => v === null || isString(v);

/** Common optional fields of a program entry, validated when present. */
function validateEntryFields(body: unknown) {
	return validateBody(body, {
		kind: { validate: isOneOf(entryKinds), required: false },
		title: { validate: isStringOrNull, required: false },
		exerciseId: { validate: isStringOrNull, required: false },
		sets: { validate: isNumberOrNull, required: false },
		reps: { validate: isStringOrNull, required: false },
		weight: { validate: isNumberOrNull, required: false },
		unit: { validate: isStringOrNull, required: false },
		notes: { validate: isStringOrNull, required: false },
		position: { validate: isNumber, required: false }
	});
}

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const programId = event.url.searchParams.get('programId');

	if (programId) {
		const program = await getProgram(user.id, programId);
		if (!program) return json({ error: 'Program not found' }, { status: 404 });
		return json(program);
	}

	return json(await getPrograms(user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'createProgram': {
			const v = validateBody(body, {
				name: { validate: isNonEmptyString, label: 'Name' },
				description: { validate: isString, required: false }
			});
			if (!v.ok) return v.error;
			return json(await createProgram(user.id, v.data), { status: 201 });
		}

		case 'createBlock': {
			const v = validateBody(body, {
				programId: { validate: isNonEmptyString, label: 'Program ID' },
				title: { validate: isNonEmptyString, label: 'Title' },
				weekdays: { validate: isWeekdays, required: false }
			});
			if (!v.ok) return v.error;
			const block = await createBlock(user.id, v.data.programId, {
				title: v.data.title,
				weekdays: v.data.weekdays as never
			});
			if (!block) return json({ error: 'Program not found or access denied' }, { status: 404 });
			return json(block, { status: 201 });
		}

		case 'createEntry': {
			const base = validateBody(body, {
				blockId: { validate: isNonEmptyString, label: 'Block ID' }
			});
			if (!base.ok) return base.error;
			const v = validateEntryFields(body);
			if (!v.ok) return v.error;
			const entry = await createEntry(user.id, base.data.blockId, v.data);
			if (!entry) return json({ error: 'Block not found or access denied' }, { status: 404 });
			return json(entry, { status: 201 });
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
		case 'updateProgram': {
			const v = validateBody(body, {
				id: { validate: isNonEmptyString, label: 'Program ID' },
				name: { validate: isNonEmptyString, required: false },
				description: { validate: isString, required: false },
				active: { validate: isBoolean, required: false }
			});
			if (!v.ok) return v.error;
			const { id, ...data } = v.data;
			const updated = await updateProgram(user.id, id, data);
			if (!updated) return json({ error: 'Program not found' }, { status: 404 });
			return json(updated);
		}

		case 'updateBlock': {
			const v = validateBody(body, {
				id: { validate: isNonEmptyString, label: 'Block ID' },
				title: { validate: isNonEmptyString, required: false },
				weekdays: { validate: isWeekdays, required: false },
				position: { validate: isNumber, required: false }
			});
			if (!v.ok) return v.error;
			const { id, ...data } = v.data;
			const updated = await updateBlock(user.id, id, {
				...data,
				weekdays: data.weekdays as never
			});
			if (!updated) return json({ error: 'Block not found' }, { status: 404 });
			return json(updated);
		}

		case 'updateEntry': {
			const base = validateBody(body, {
				id: { validate: isNonEmptyString, label: 'Entry ID' }
			});
			if (!base.ok) return base.error;
			const v = validateEntryFields(body);
			if (!v.ok) return v.error;
			const updated = await updateEntry(user.id, base.data.id, v.data);
			if (!updated) return json({ error: 'Entry not found' }, { status: 404 });
			return json(updated);
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const type = event.url.searchParams.get('type');
	const id = event.url.searchParams.get('id');
	if (!id) return json({ error: 'id required' }, { status: 400 });

	const deleted =
		type === 'program'
			? await deleteProgram(user.id, id)
			: type === 'block'
				? await deleteBlock(user.id, id)
				: type === 'entry'
					? await deleteEntry(user.id, id)
					: false;

	if (!deleted) return json({ error: 'Not found or invalid type' }, { status: 404 });
	return json({ success: true });
};
