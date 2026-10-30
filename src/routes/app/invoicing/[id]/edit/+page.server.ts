import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getInvoice, getClients, getProducts } from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const invoice = await getInvoice(locals.user.id, params.id);
	if (!invoice) {
		throw error(404, 'Facture non trouvée');
	}

	const [clients, products] = await Promise.all([
		getClients(locals.user.id),
		getProducts(locals.user.id)
	]);

	return {
		invoice,
		clients,
		products
	};
};
