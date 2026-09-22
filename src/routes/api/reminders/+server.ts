import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createReminderTemplate,
	getReminderTemplates,
	getReminderTemplateById,
	updateReminderTemplate,
	updateReminderTemplateTodos,
	deleteReminderTemplate,
	generateDueReminders,
	getDueReminders,
	getReminderHistory,
	getReminderById,
	completeReminder,
	snoozeReminder,
	updateReminderTodo,
	getReminderStats
} from '$lib/server/services/reminder.service';
import { requireUser } from '$lib/server/api-helpers';
import {
	parseJson,
	validateBody,
	isString,
	isNonEmptyString,
	isOneOf,
	isNumber,
	isArray
} from '$lib/server/validate';

const recurrenceTypes = [
	'daily',
	'weekly',
	'monthly',
	'yearly',
	'yearly_date',
	'monthly_relative'
] as const;

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const templateId = event.url.searchParams.get('templateId');
	const reminderId = event.url.searchParams.get('reminderId');
	const action = event.url.searchParams.get('action');

	// Generate due reminders first
	await generateDueReminders(user.id);

	if (action === 'stats') {
		const stats = await getReminderStats(user.id, templateId ?? undefined);
		return json(stats);
	}

	if (reminderId) {
		const reminderData = await getReminderById(user.id, reminderId);
		if (!reminderData) return json({ error: 'Reminder not found' }, { status: 404 });
		return json(reminderData);
	}

	if (templateId) {
		const template = await getReminderTemplateById(user.id, templateId);
		if (!template) return json({ error: 'Template not found' }, { status: 404 });
		return json(template);
	}

	const mode = event.url.searchParams.get('mode');

	if (mode === 'due') {
		const dueReminders = await getDueReminders(user.id);
		return json(dueReminders);
	}

	if (mode === 'history') {
		const startDateStr = event.url.searchParams.get('startDate');
		const endDateStr = event.url.searchParams.get('endDate');

		if (!startDateStr || !endDateStr) {
			return json({ error: 'startDate and endDate required for history' }, { status: 400 });
		}

		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);
		const filterTemplateId = event.url.searchParams.get('filterTemplateId');

		const history = await getReminderHistory(
			user.id,
			startDate,
			endDate,
			filterTemplateId ?? undefined
		);
		return json(history);
	}

	// Default: return templates
	const templates = await getReminderTemplates(user.id);
	return json(templates);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'createTemplate': {
			const v = validateBody(body, {
				title: { validate: isNonEmptyString, label: 'Title' },
				recurrenceType: { validate: isOneOf(recurrenceTypes), label: 'Recurrence type' },
				description: { validate: isString, required: false },
				markdown: { validate: isString, required: false },
				icon: { validate: isString, required: false },
				iconColor: { validate: isString, required: false },
				recurrenceConfig: { validate: isString, required: false },
				nextDueAt: { validate: isString, required: false },
				position: { validate: isNumber, required: false },
				todos: { validate: isArray((t): t is string => typeof t === 'string'), required: false }
			});
			if (!v.ok) return v.error;

			const template = await createReminderTemplate(user.id, {
				...v.data,
				nextDueAt: v.data.nextDueAt ? new Date(v.data.nextDueAt) : undefined,
				todos: v.data.todos as string[] | undefined
			} as any);
			return json(template, { status: 201 });
		}

		case 'completeReminder': {
			const v = validateBody(body, {
				reminderId: { validate: isNonEmptyString, label: 'Reminder ID' }
			});
			if (!v.ok) return v.error;

			const completed = await completeReminder(user.id, v.data.reminderId);
			if (!completed) return json({ error: 'Not found' }, { status: 404 });
			return json(completed);
		}

		case 'snoozeReminder': {
			const v = validateBody(body, {
				reminderId: { validate: isNonEmptyString, label: 'Reminder ID' },
				until: { validate: isNonEmptyString, label: 'Snooze until' }
			});
			if (!v.ok) return v.error;

			const snoozed = await snoozeReminder(user.id, v.data.reminderId, new Date(v.data.until));
			if (!snoozed) return json({ error: 'Not found' }, { status: 404 });
			return json(snoozed);
		}

		case 'updateTodo': {
			const v = validateBody(body, {
				todoId: { validate: isNonEmptyString, label: 'Todo ID' },
				completed: { validate: (v): v is boolean => typeof v === 'boolean', label: 'Completed' }
			});
			if (!v.ok) return v.error;

			const updated = await updateReminderTodo(user.id, v.data.todoId, v.data.completed);
			if (!updated) return json({ error: 'Todo not found' }, { status: 404 });
			return json(updated);
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
		case 'updateTemplate': {
			const v = validateBody(body, {
				templateId: { validate: isNonEmptyString, label: 'Template ID' },
				title: { validate: isString, required: false },
				description: { validate: isString, required: false },
				markdown: { validate: isString, required: false },
				icon: { validate: isString, required: false },
				iconColor: { validate: isString, required: false },
				recurrenceType: { validate: isOneOf(recurrenceTypes), required: false },
				recurrenceConfig: { validate: isString, required: false },
				nextDueAt: { validate: isString, required: false },
				active: { validate: (v): v is boolean => typeof v === 'boolean', required: false },
				position: { validate: isNumber, required: false }
			});
			if (!v.ok) return v.error;

			const updated = await updateReminderTemplate(user.id, v.data.templateId, {
				...v.data,
				nextDueAt: v.data.nextDueAt ? new Date(v.data.nextDueAt) : undefined
			} as any);
			return json(updated);
		}

		case 'updateTemplateTodos': {
			const v = validateBody(body, {
				templateId: { validate: isNonEmptyString, label: 'Template ID' },
				todos: { validate: isArray((t): t is string => typeof t === 'string'), label: 'Todos' }
			});
			if (!v.ok) return v.error;

			const updated = await updateReminderTemplateTodos(
				user.id,
				v.data.templateId,
				v.data.todos as string[]
			);
			if (!updated) return json({ error: 'Template not found' }, { status: 404 });
			return json(updated);
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'deleteTemplate': {
			const v = validateBody(body, {
				templateId: { validate: isNonEmptyString, label: 'Template ID' }
			});
			if (!v.ok) return v.error;

			await deleteReminderTemplate(user.id, v.data.templateId);
			return json({ success: true });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
