import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createExpense,
	getExpenses,
	getExpenseById,
	updateExpense,
	deleteExpense,
	getMonthlyStats,
	getDailyStats,
	getUserSettings,
	updateUserSettings
} from '$lib/server/services/finance.service';
import { requireUser } from '$lib/server/api-helpers';
import {
	parseJson,
	validateBody,
	isString,
	isNumber,
	isArray,
	intParam
} from '$lib/server/validate';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const action = event.url.searchParams.get('action');

	if (action === 'settings') {
		const settings = await getUserSettings(user.id);
		return json(settings);
	}

	if (action === 'monthlyStats') {
		const year = intParam(event.url.searchParams.get('year'), new Date().getFullYear());
		const month = intParam(event.url.searchParams.get('month'), new Date().getMonth());
		const stats = await getMonthlyStats(user.id, year, month);
		const settings = await getUserSettings(user.id);
		return json({ ...stats, currency: settings.currency, limit: settings.monthlySpendingLimit });
	}

	if (action === 'dailyStats') {
		const year = intParam(event.url.searchParams.get('year'), new Date().getFullYear());
		const month = intParam(event.url.searchParams.get('month'), new Date().getMonth());
		const stats = await getDailyStats(user.id, year, month);
		return json(stats);
	}

	const expenseId = event.url.searchParams.get('id');
	if (expenseId) {
		const expenseData = await getExpenseById(user.id, expenseId);
		if (!expenseData) return json({ error: 'Expense not found' }, { status: 404 });
		return json(expenseData);
	}

	// Get expenses with optional date range
	const startDateStr = event.url.searchParams.get('startDate');
	const endDateStr = event.url.searchParams.get('endDate');
	const limit = intParam(event.url.searchParams.get('limit'), 50);
	const offset = intParam(event.url.searchParams.get('offset'), 0);

	const expenses = await getExpenses(user.id, {
		startDate: startDateStr ? new Date(startDateStr) : undefined,
		endDate: endDateStr ? new Date(endDateStr) : undefined,
		limit,
		offset
	});

	return json(expenses);
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'createExpense': {
			const v = validateBody(body, {
				amount: { validate: isNumber, label: 'Amount' },
				spentAt: { validate: isString, label: 'Date' },
				currency: { validate: isString, required: false },
				description: { validate: isString, required: false },
				markdown: { validate: isString, required: false },
				tags: { validate: isArray((t): t is string => typeof t === 'string'), required: false }
			});
			if (!v.ok) return v.error;

			const newExpense = await createExpense(user.id, {
				...v.data,
				spentAt: new Date(v.data.spentAt),
				tags: v.data.tags as string[] | undefined
			} as any);
			return json(newExpense, { status: 201 });
		}

		case 'updateSettings': {
			const v = validateBody(body, {
				currency: { validate: isString, required: false },
				currencyRate: { validate: isNumber, required: false },
				monthlySpendingLimit: { validate: isNumber, required: false }
			});
			if (!v.ok) return v.error;

			const settings = await updateUserSettings(user.id, v.data as any);
			return json(settings);
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
		case 'updateExpense': {
			const v = validateBody(body, {
				expenseId: { validate: isString, label: 'Expense ID' },
				amount: { validate: isNumber, required: false },
				spentAt: { validate: isString, required: false },
				currency: { validate: isString, required: false },
				description: { validate: isString, required: false },
				markdown: { validate: isString, required: false },
				tags: { validate: isArray((t): t is string => typeof t === 'string'), required: false }
			});
			if (!v.ok) return v.error;

			const updateData: any = { ...v.data };
			if (v.data.spentAt) updateData.spentAt = new Date(v.data.spentAt);
			if (v.data.tags) updateData.tags = v.data.tags;

			const updated = await updateExpense(user.id, v.data.expenseId, updateData);
			if (!updated) return json({ error: 'Not found' }, { status: 404 });
			return json(updated);
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
		case 'deleteExpense': {
			const v = validateBody(body, {
				expenseId: { validate: isString, label: 'Expense ID' }
			});
			if (!v.ok) return v.error;

			await deleteExpense(user.id, v.data.expenseId);
			return json({ success: true });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
