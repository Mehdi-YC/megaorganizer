import { getReminderById, getReminderTemplateById, getReminderHistory } from '$lib/server/services/reminder.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Try to find as reminder first, then as template
	const reminderData = await getReminderById(locals.user.id, params.id);

	if (reminderData) {
		// Load template info and recent history
		const template = await getReminderTemplateById(locals.user.id, reminderData.templateId);
		
		// Get last 30 days of history for this template
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 30);
		const history = await getReminderHistory(locals.user.id, startDate, endDate, reminderData.templateId);

		return {
			type: 'reminder' as const,
			reminder: reminderData,
			template,
			history
		};
	}

	// Try as template
	const templateData = await getReminderTemplateById(locals.user.id, params.id);

	if (templateData) {
		// Get last 30 days of history
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 30);
		const history = await getReminderHistory(locals.user.id, startDate, endDate, params.id);

		return {
			type: 'template' as const,
			template: templateData,
			history
		};
	}

	throw error(404, 'Reminder not found');
};
