import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Test User';

let cachedUser: any = null;

async function getOrCreateTestUser() {
	if (cachedUser) return cachedUser;

	let existing = await db.select().from(user).where(eq(user.email, TEST_EMAIL)).get();

	if (!existing) {
		await auth.api.signUpEmail({
			body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }
		});
		existing = await db.select().from(user).where(eq(user.email, TEST_EMAIL)).get();
	}

	cachedUser = existing;
	return existing;
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	const testUser = await getOrCreateTestUser();

	if (testUser) {
		event.locals.user = testUser as any;
		event.locals.session = {
			id: 'session_test',
			userId: testUser.id,
			token: 'test-token',
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
			ipAddress: '127.0.0.1',
			userAgent: 'test'
		} as any;
	}

	return resolve(event);
};

export const handle: Handle = handleBetterAuth;
