import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProducts } from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const products = await getProducts(locals.user.id);

	return {
		products
	};
};
