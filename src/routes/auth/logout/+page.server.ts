import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/auth/login');
};

export const actions: Actions = {
	default: async ({ locals }) => {
		if (locals.session) {
			await auth.api.signOut({ headers: new Headers() });
		}
		throw redirect(302, '/auth/login');
	}
};
