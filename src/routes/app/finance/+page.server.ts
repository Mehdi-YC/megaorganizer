import {
	getExpenses,
	getMonthlyStats,
	getUserSettings
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
	const { year, month } = parseMonth(url.searchParams.get('month'));
	const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;

	if (!locals.user) {
		return {
			expenses: [],
			monthlyStats: { total: 0, count: 0 },
			settings: { currency: 'DZD', currencyRate: 1, monthlySpendingLimit: null },
			year,
			month,
			monthParam
		};
	}

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
		month,
		monthParam
	};
};
