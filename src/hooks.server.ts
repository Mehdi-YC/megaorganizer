import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session?.user) {
		event.locals.user = session.user;
		event.locals.session = session.session;
	} else {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response('Unauthorized', { status: 401 });
		}
		if (!event.url.pathname.startsWith('/auth')) {
			throw redirect(302, '/auth/login');
		}
	}

	const response = await resolve(event);

	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}

	return response;
};

export const handle: Handle = handleBetterAuth;
