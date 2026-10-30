import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getClients } from '$lib/server/services/invoice.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const clients = await getClients(locals.user.id);

	return {
		clients
	};
};
