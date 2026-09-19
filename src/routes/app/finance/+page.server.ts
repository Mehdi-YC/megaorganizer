import {
	getExpenses,
	getMonthlyStats,
	getUserSettings
} from '$lib/server/services/finance.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			expenses: [],
			monthlyStats: { total: 0, count: 0 },
			settings: { currency: 'DZD', currencyRate: 1, monthlySpendingLimit: null }
		};
	}

	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	// Get start and end of current month
	const startDate = new Date(year, month, 1);
	const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

	const [expenses, monthlyStats, settings] = await Promise.all([
		getExpenses(locals.user.id, { startDate, endDate, limit: 100 }),
		getMonthlyStats(locals.user.id, year, month),
		getUserSettings(locals.user.id)
	]);

	return {
		expenses,
		monthlyStats,
		settings,
		year,
		month
	};
};
