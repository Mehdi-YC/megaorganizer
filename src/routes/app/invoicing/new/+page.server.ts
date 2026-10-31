import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getClients,
	getProducts,
	getNextInvoiceNumber,
	getUserInvoiceProfile
} from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const currentYear = new Date().getFullYear();
	const [clients, products, nextNumber, profile] = await Promise.all([
		getClients(locals.user.id),
		getProducts(locals.user.id),
		getNextInvoiceNumber(locals.user.id, currentYear),
		getUserInvoiceProfile(locals.user.id)
	]);

	return {
		clients,
		products,
		nextNumber,
		profile
	};
};
