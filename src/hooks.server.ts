import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

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

	return resolve(event);
};

export const handle: Handle = handleBetterAuth;
