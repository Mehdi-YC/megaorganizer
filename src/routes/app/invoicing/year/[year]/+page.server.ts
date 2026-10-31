import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getInvoices, getYearlyDocs, getInvoiceYears } from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const year = parseInt(params.year, 10);
	if (isNaN(year)) {
		throw error(400, 'Année invalide');
	}

	const [invoices, docs, years] = await Promise.all([
		getInvoices(locals.user.id, year),
		getYearlyDocs(locals.user.id, year),
		getInvoiceYears(locals.user.id)
	]);

	const g12Doc = docs.find((d) => d.docType === 'g12') || null;
	const g12BisDoc = docs.find((d) => d.docType === 'g12_bis') || null;

	return {
		year,
		invoices,
		g12Doc,
		g12BisDoc,
		years
	};
};
