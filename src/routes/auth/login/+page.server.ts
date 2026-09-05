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
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required' });
		}

		const rateKey = `login:${event.getClientAddress()}`;
		const { allowed, retryAfterMs } = checkRateLimit(rateKey);
		if (!allowed) {
			const minutes = Math.ceil(retryAfterMs / 60000);
			return fail(429, { message: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.` });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: event.request.headers
			});
		} catch (error) {
			const message = error instanceof Error ? 'Invalid email or password' : 'An unexpected error occurred';
			return fail(400, { message });
		}

		resetRateLimit(rateKey);
		throw redirect(302, '/app');
	}
};
