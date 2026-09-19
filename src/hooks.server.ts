import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { logError } from '$lib/server/error-log';

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
	'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' ws: wss:; frame-src 'self' https://www.youtube.com https://www.google.com;"
};

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB for regular API requests
const MAX_UPLOAD_BODY_SIZE = 100 * 1024 * 1024; // 100MB for file uploads

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth')) {
		const response = await svelteKitHandler({ event, resolve, auth, building });
		for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
			response.headers.set(key, value);
		}
		return response;
	}

	// Check request body size for API endpoints
	if (event.request.method !== 'GET' && event.url.pathname.startsWith('/api/')) {
		const contentLength = event.request.headers.get('content-length');
		const isUpload = event.url.pathname.includes('/attachments') || event.url.pathname.includes('/backup');
		const maxSize = isUpload ? MAX_UPLOAD_BODY_SIZE : MAX_BODY_SIZE;
		
		if (contentLength && parseInt(contentLength) > maxSize) {
			return new Response(JSON.stringify({ error: 'Request body too large' }), {
				status: 413,
				headers: { 'Content-Type': 'application/json' }
			});
		}
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

export const handleError: HandleServerError = async ({ error, event }) => {
	const errorId = crypto.randomUUID();
	logError('unhandled', error, {
		errorId,
		path: event.url.pathname,
		method: event.request.method,
		userId: event.locals.user?.id
	});
	return {
		message: 'An unexpected error occurred',
		errorId
	};
};
