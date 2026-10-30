import { redirect } from '@sveltejs/kit';
import { getCategoriesWithPages } from '$lib/server/services/category.service';
import { getInvoiceYears } from '$lib/server/services/invoice.service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const [categories, invoiceYears] = await Promise.all([
		getCategoriesWithPages(locals.user.id),
		getInvoiceYears(locals.user.id)
	]);

	return {
		categories,
		invoiceYears,
		user: {
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image
		}
	};
};
