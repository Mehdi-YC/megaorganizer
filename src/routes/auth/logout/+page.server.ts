import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/auth/login');
};

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.session) {
			await auth.api.signOut({
				headers: event.request.headers
			});
		}
		throw redirect(302, '/auth/login');
	}
};
