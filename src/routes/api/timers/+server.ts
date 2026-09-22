import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createTimerTemplate,
	getTimerTemplates,
	getTimerTemplateById,
	updateTimerTemplate,
	deleteTimerTemplate,
	duplicateTimerTemplate,
	type TimerStepInput
} from '$lib/server/services/timer.service';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isString, isNumber, isArray } from '$lib/server/validate';

const stepKinds = ['start', 'normal', 'info', 'silent', 'end', 'group'] as const;

function isStepInput(value: unknown): value is TimerStepInput {
	if (typeof value !== 'object' || value === null) return false;
	const step = value as Record<string, unknown>;
	if (!stepKinds.includes(step.kind as (typeof stepKinds)[number])) return false;
	if (typeof step.label !== 'string') return false;
	if (step.durationSec != null && typeof step.durationSec !== 'number') return false;
	if (step.groupRounds != null && typeof step.groupRounds !== 'number') return false;
	if (step.children != null) {
		if (!Array.isArray(step.children)) return false;
		return step.children.every(isStepInput);
	}
	return true;
}

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const templateId = event.url.searchParams.get('id');

	if (templateId) {
		const template = await getTimerTemplateById(user.id, templateId);
		if (!template) return json({ error: 'Not found' }, { status: 404 });
		return json(template);
	}

	return json(await getTimerTemplates(user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'createTemplate': {
			const v = validateBody(body, {
				name: { validate: isString, label: 'Name' },
				description: { validate: isString, required: false },
				rounds: { validate: isNumber, required: false },
				steps: { validate: isArray(isStepInput), required: false, label: 'Steps' }
			});
			if (!v.ok) return v.error;

			const template = await createTimerTemplate(user.id, {
				name: v.data.name,
				description: v.data.description,
				rounds: v.data.rounds,
				steps: v.data.steps as TimerStepInput[] | undefined
			});
			return json(template, { status: 201 });
		}

		case 'duplicateTemplate': {
			const v = validateBody(body, {
				templateId: { validate: isString, label: 'Template ID' }
			});
			if (!v.ok) return v.error;

			const template = await duplicateTimerTemplate(user.id, v.data.templateId);
			if (!template) return json({ error: 'Not found' }, { status: 404 });
			return json(template, { status: 201 });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'updateTemplate': {
			const v = validateBody(body, {
				templateId: { validate: isString, label: 'Template ID' },
				name: { validate: isString, required: false },
				description: { validate: isString, required: false },
				rounds: { validate: isNumber, required: false },
				steps: { validate: isArray(isStepInput), required: false, label: 'Steps' }
			});
			if (!v.ok) return v.error;

			const template = await updateTimerTemplate(user.id, v.data.templateId, {
				name: v.data.name,
				description: v.data.description,
				rounds: v.data.rounds,
				steps: v.data.steps as TimerStepInput[] | undefined
			});
			if (!template) return json({ error: 'Not found' }, { status: 404 });
			return json(template);
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'deleteTemplate': {
			const v = validateBody(body, {
				templateId: { validate: isString, label: 'Template ID' }
			});
			if (!v.ok) return v.error;

			const ok = await deleteTimerTemplate(user.id, v.data.templateId);
			if (!ok) return json({ error: 'Not found' }, { status: 404 });
			return json({ success: true });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
