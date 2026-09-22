import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { RequestEvent } from '@sveltejs/kit';
import { checkRateLimit } from './rate-limit';

export function requireUser(event: RequestEvent) {
	if (!event.locals.user) {
		// Throwing a Response degrades to a 500 in SvelteKit; throw the kit
		// HttpError instead so the status code survives.
		throw error(401, { message: 'Unauthorized', error: 'Unauthorized' });
	}
	return event.locals.user;
}

/**
 * Require user and check API rate limit.
 * Use this for API endpoints that need rate limiting.
 */
export function requireUserWithRateLimit(event: RequestEvent, maxRequests = 100, windowMs = 60000) {
	const user = requireUser(event);

	// Rate limit by user ID
	const { allowed, retryAfterMs } = checkRateLimit(`api:${user.id}`, maxRequests, windowMs);
	if (!allowed) {
		throw error(429, { message: 'Too many requests', error: 'Too many requests', retryAfterMs });
	}

	return user;
}

export function handleAuthError(error: unknown, fallback = 'An unexpected error occurred') {
	if (error instanceof APIError) {
		return { status: 400 as const, message: error.message || fallback };
	}
	return { status: 500 as const, message: fallback };
}

/**
 * Standard error response for API endpoints.
 * Returns user-friendly error messages without leaking internals.
 */
export function apiError(message: string, status = 400) {
	return json({ error: message }, { status });
}

/**
 * Standard success response for API endpoints.
 */
export function apiSuccess(data: unknown, status = 200) {
	return json(data, { status });
}

/**
 * Wrap an API handler with standardized error handling.
 * Catches unexpected errors and returns safe error messages.
 */
export function withErrorHandling(handler: () => Promise<Response>): Promise<Response> {
	return handler().catch((error) => {
		console.error('API Error:', error);

		// Don't expose internal error details in production
		const message =
			process.env.NODE_ENV === 'production'
				? 'An unexpected error occurred'
				: error instanceof Error
					? error.message
					: 'Unknown error';

		return json({ error: message }, { status: 500 });
	});
}
