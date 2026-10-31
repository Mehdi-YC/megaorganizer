import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getInvoices, getInvoiceYears, getClients } from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const yearParam = url.searchParams.get('year');
	const statusParam = url.searchParams.get('status');

	const year = yearParam ? parseInt(yearParam, 10) : undefined;
	const status = statusParam || undefined;

	const [invoices, years, clients] = await Promise.all([
		getInvoices(locals.user.id, year, status),
		getInvoiceYears(locals.user.id),
		getClients(locals.user.id)
	]);

	return {
		invoices,
		years,
		clients,
		currentYear: year,
		currentStatus: status
	};
};
