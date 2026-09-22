import { getTrainingSessionsInRange } from '$lib/server/services/training.service';
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

function parseMonth(param: string | null): { year: number; month: number } {
	if (param && /^\d{4}-\d{2}$/.test(param)) {
		const [y, m] = param.split('-').map(Number);
		if (m >= 1 && m <= 12) return { year: y, month: m - 1 };
	}
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const filter = url.searchParams.get('filter') || null;
	const { year, month } = parseMonth(url.searchParams.get('month'));
	const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;

	// Grid spans Monday of the week containing the 1st → last day of month
	const firstDay = new Date(year, month, 1);
	const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
	const gridStart = new Date(year, month, 1 - startDay);
	const gridEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

	if (!locals.user) {
		return {
			sessions: [],
			reminders: [],
			virtualReminders: [],
			templates: [],
			expenses: [],
			expenseSettings: { currency: 'DZD' },
			monthlyExpenses: [],
			upcoming: [],
			filter,
			month: monthParam
		};
	}

	const now = new Date();
	const upcomingStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const upcomingEnd = new Date(upcomingStart);
	upcomingEnd.setDate(upcomingEnd.getDate() + 7);
	upcomingEnd.setHours(23, 59, 59, 999);

	// Union of the visible grid and the upcoming window so day panels stay accurate
	const rangeStart = gridStart < upcomingStart ? gridStart : upcomingStart;
	const rangeEnd = gridEnd > upcomingEnd ? gridEnd : upcomingEnd;

	const [
		sessions,
		reminders,
		virtualReminders,
		templates,
		expenses,
		expenseSettings,
		monthlyExpenses
	] = await Promise.all([
		getTrainingSessionsInRange(locals.user.id, rangeStart, rangeEnd),
		getReminderHistory(locals.user.id, rangeStart, rangeEnd),
		getVirtualReminders(locals.user.id, rangeStart, rangeEnd),
		getReminderTemplates(locals.user.id),
		getExpensesForDateRange(locals.user.id, rangeStart, rangeEnd),
		getUserSettings(locals.user.id),
		getMonthlyTotalForDateRange(locals.user.id, rangeStart, rangeEnd)
	]);

	// Upcoming reminders (incomplete instances + scheduled templates), next 7 days
	const upcomingInstances = reminders
		.filter((r) => !r.completed && r.dueAt >= upcomingStart && r.dueAt <= upcomingEnd)
		.map((r) => ({
			id: r.id,
			templateId: r.templateId,
			title: r.title,
			dueAt: r.dueAt,
			isVirtual: false
		}));

	const coveredTemplates = new Set(upcomingInstances.map((r) => r.templateId));
	const upcomingVirtual = virtualReminders
		.filter(
			(r) =>
				r.dueAt >= upcomingStart && r.dueAt <= upcomingEnd && !coveredTemplates.has(r.templateId)
		)
		.map((r) => ({
			id: r.id,
			templateId: r.templateId,
			title: r.title,
			dueAt: r.dueAt,
			isVirtual: true
		}));

	const upcoming = [...upcomingInstances, ...upcomingVirtual]
		.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
		.slice(0, 10);

	return {
		sessions,
		reminders,
		virtualReminders,
		templates,
		expenses,
		expenseSettings,
		monthlyExpenses,
		upcoming,
		filter,
		month: monthParam
	};
};
