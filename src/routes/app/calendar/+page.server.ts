import { getTrainingSessions } from '$lib/server/services/training.service';
import {
	getReminderHistory,
	getReminderTemplates,
	getVirtualReminders
} from '$lib/server/services/reminder.service';
import {
	getExpensesForDateRange,
	getUserSettings,
	getMonthlyTotalForDateRange
} from '$lib/server/services/finance.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		return {
			sessions: [],
			reminders: [],
			virtualReminders: [],
			templates: [],
			expenses: [],
			expenseSettings: { currency: 'DZD' },
			monthlyExpenses: [],
			filter: null
		};
	}

	const filter = url.searchParams.get('filter') || null;

	// Get last 90 days and next 60 days for a wide range
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + 60);
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 90);

	const [
		sessions,
		reminders,
		virtualReminders,
		templates,
		expenses,
		expenseSettings,
		monthlyExpenses
	] = await Promise.all([
		getTrainingSessions(locals.user.id, 200, 0),
		getReminderHistory(locals.user.id, startDate, endDate),
		getVirtualReminders(locals.user.id, new Date(), endDate),
		getReminderTemplates(locals.user.id),
		getExpensesForDateRange(locals.user.id, startDate, endDate),
		getUserSettings(locals.user.id),
		getMonthlyTotalForDateRange(locals.user.id, startDate, endDate)
	]);

	return {
		sessions,
		reminders,
		virtualReminders,
		templates,
		expenses,
		expenseSettings,
		monthlyExpenses,
		filter
	};
};
