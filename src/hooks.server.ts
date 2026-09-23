import type { Handle, HandleServerError } from '@sveltejs/kit';
import { json, redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { logError } from '$lib/server/error-log';
import { startScheduler } from '$lib/server/services/scheduler';
import { checkRateLimit } from '$lib/server/rate-limit';

// Background reminder delivery (see services/scheduler.ts). Skipped during
// the build, which evaluates this module graph without a server process.
if (!building) startScheduler();

// Content-Security-Policy is emitted by SvelteKit (nonce mode, see
// vite.config.ts) so its inline bootstrap scripts keep working.
const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
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

	// Enforce body size on API writes. The check must not depend on
	// content-length being present and numeric: chunked or malformed
	// headers are rejected instead of buffered unbounded.
	if (event.request.method !== 'GET' && event.url.pathname.startsWith('/api/')) {
		const contentLength = Number(event.request.headers.get('content-length'));
		if (!Number.isFinite(contentLength)) {
			return json({ error: 'Content-Length required' }, { status: 411 });
		}
		const isUpload =
			event.url.pathname.includes('/attachments') || event.url.pathname.includes('/backup');
		const maxSize = isUpload ? MAX_UPLOAD_BODY_SIZE : MAX_BODY_SIZE;
		if (contentLength > maxSize) {
			return json({ error: 'Request body too large' }, { status: 413 });
		}
	}
	// The share endpoint accepts multipart text shares only.
	if (event.request.method === 'POST' && event.url.pathname === '/share-target') {
		const contentLength = Number(event.request.headers.get('content-length'));
		if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
			return redirect(303, '/app');
		}
	}

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session?.user) {
		event.locals.user = session.user;
		event.locals.session = session.session;

		// Central API rate limit (per user): 300 requests per minute.
		if (event.url.pathname.startsWith('/api/')) {
			const { allowed, retryAfterMs } = checkRateLimit(`api:${session.user.id}`, 300, 60_000);
			if (!allowed) {
				return json(
					{ error: 'Too many requests', retryAfterMs },
					{
						status: 429,
						headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) }
					}
				);
			}
		}
	} else {
		if (event.url.pathname.startsWith('/api/')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
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
		error: 'An unexpected error occurred',
		errorId
	};
};
