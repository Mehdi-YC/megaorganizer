import { db } from '$lib/server/db';
import { account, user } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { checkRateLimit, rateLimitStatus, resetRateLimit } from '$lib/server/rate-limit';

// The MCP endpoint lives outside the session-cookie flow: AI clients cannot
// open a browser to log in. They send the account's email and password with
// every request instead, and each request is resolved to that account's id.
//
// This deliberately stores nothing: no token table, no session rows, no
// migrations. The trade-off is that a client config holds a password that
// grants full account access, and revoking means changing the password.
// Credentials are accepted as `Bearer <email>:<password>` or HTTP Basic.

const AUTH_HEADER = /^(Basic|Bearer)\s+(.+)$/i;
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

// A successful credential check costs one scrypt verification (~50ms). Agents
// call several tools per turn, so keep the result for a short while. The cache
// is keyed by a digest, never the password itself, and expires quickly enough
// that a password change takes effect on the next turn.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 100;
const verified = new Map<string, { userId: string; expiresAt: number }>();

export type McpAuthResult =
	| { ok: true; userId: string }
	| { ok: false; status: number; error: string; headers?: Record<string, string> };

const CHALLENGE = { 'WWW-Authenticate': 'Bearer realm="megaorganize-mcp"' };

function unauthorized(error: string): McpAuthResult {
	return { ok: false, status: 401, error, headers: CHALLENGE };
}

async function digest(value: string): Promise<string> {
	const bytes = new Uint8Array(
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
	);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(value: string): string | null {
	try {
		const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
		const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
		return atob(padded);
	} catch {
		return null;
	}
}

/** Split `email:password` on the first colon; passwords may contain colons. */
export function parseCredentials(
	header: string | null
): { email: string; password: string } | null {
	const match = header ? AUTH_HEADER.exec(header.trim()) : null;
	if (!match) return null;

	const raw = match[1].toLowerCase() === 'basic' ? decodeBase64(match[2].trim()) : match[2].trim();
	if (raw === null) return null;

	const separator = raw.indexOf(':');
	if (separator <= 0) return null;

	const email = raw.slice(0, separator).trim();
	const password = raw.slice(separator + 1);
	if (!email || !password) return null;

	return { email, password };
}

// Verifying against a throwaway hash keeps the response time for an unknown
// email close to the time for a wrong password, so the endpoint does not
// reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
	dummyHash ??= hashPassword(crypto.randomUUID());
	return dummyHash;
}

function cacheGet(key: string): string | null {
	const entry = verified.get(key);
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		verified.delete(key);
		return null;
	}
	return entry.userId;
}

function cacheSet(key: string, userId: string): void {
	if (verified.size >= CACHE_MAX_ENTRIES) {
		const oldest = verified.keys().next();
		if (!oldest.done) verified.delete(oldest.value);
	}
	verified.set(key, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function authenticateMcpRequest(request: Request): Promise<McpAuthResult> {
	const credentials = parseCredentials(request.headers.get('authorization'));
	if (!credentials) {
		return unauthorized(
			'Send your account email and password as "Authorization: Bearer <email>:<password>" or HTTP Basic auth'
		);
	}

	const email = credentials.email.toLowerCase();
	const failureKey = `mcp-auth:${email}`;

	const failures = rateLimitStatus(failureKey, MAX_FAILURES);
	if (failures.exceeded) {
		return {
			ok: false,
			status: 429,
			error: 'Too many failed sign-in attempts; try again later',
			headers: { 'Retry-After': String(Math.ceil(failures.retryAfterMs / 1000)) }
		};
	}

	const cacheKey = await digest(`${email}\u0000${credentials.password}`);
	const cached = cacheGet(cacheKey);
	if (cached) return { ok: true, userId: cached };

	const row = await db
		.select({ userId: user.id, hash: account.password })
		.from(user)
		.innerJoin(account, eq(account.userId, user.id))
		.where(and(sql`lower(${user.email}) = ${email}`, eq(account.providerId, 'credential')))
		.get();

	const valid = await verifyPassword({
		hash: row?.hash ?? (await getDummyHash()),
		password: credentials.password
	}).catch(() => false);

	if (!row?.hash || !valid) {
		checkRateLimit(failureKey, MAX_FAILURES, FAILURE_WINDOW_MS);
		return unauthorized('Invalid email or password');
	}

	resetRateLimit(failureKey);
	cacheSet(cacheKey, row.userId);
	return { ok: true, userId: row.userId };
}
