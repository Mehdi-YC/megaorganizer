import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { checkRateLimit, resetRateLimit } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/app');
	}
	return {};
};

export const actions: Actions = {
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString() ?? '';
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!name || !email || !password) {
			return fail(400, { message: 'Name, email, and password are required' });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters' });
		}

		const rateKey = `register:${event.getClientAddress()}`;
		const { allowed, retryAfterMs } = checkRateLimit(rateKey);
		if (!allowed) {
			const minutes = Math.ceil(retryAfterMs / 60000);
			return fail(429, { message: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.` });
		}

		try {
			await auth.api.signUpEmail({
				body: { name, email, password },
				headers: event.request.headers
			});
		} catch (error) {
			const message = error instanceof Error ? 'Registration failed' : 'An unexpected error occurred';
			return fail(400, { message });
		}

		resetRateLimit(rateKey);
		throw redirect(302, '/app');
	}
};
