import { json } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { RequestEvent } from '@sveltejs/kit';

export function requireUser(event: RequestEvent) {
	if (!event.locals.user) {
		throw json({ error: 'Unauthorized' }, { status: 401 });
	}
	return event.locals.user;
}

export function handleAuthError(error: unknown, fallback = 'An unexpected error occurred') {
	if (error instanceof APIError) {
		return { status: 400 as const, message: error.message || fallback };
	}
	return { status: 500 as const, message: fallback };
}
