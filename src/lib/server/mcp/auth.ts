import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

// The MCP endpoint is outside the session-cookie flow: AI clients cannot log
// in through the browser. A static bearer token from the environment grants
// read access to exactly one account, chosen by MCP_USER_EMAIL/MCP_USER_ID
// (or the only account when the instance has a single user).

const BEARER = /^Bearer\s+(.+)$/i;
const MIN_TOKEN_LENGTH = 16;

export type McpAuthResult =
	| { ok: true; userId: string }
	| { ok: false; status: number; error: string; headers?: Record<string, string> };

/**
 * Compare two secrets without leaking their length or content through timing.
 * Hashing first makes the comparison fixed-length regardless of input size.
 */
async function secretsMatch(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const [digestA, digestB] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(a)),
		crypto.subtle.digest('SHA-256', encoder.encode(b))
	]);
	const bytesA = new Uint8Array(digestA);
	const bytesB = new Uint8Array(digestB);
	let diff = 0;
	for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
	return diff === 0;
}

async function resolveMcpUserId(): Promise<{ id: string } | { error: string }> {
	const email = env.MCP_USER_EMAIL?.trim();
	if (email) {
		const row = await db
			.select({ id: user.id })
			.from(user)
			.where(sql`lower(${user.email}) = ${email.toLowerCase()}`)
			.get();
		return row ? { id: row.id } : { error: `MCP_USER_EMAIL "${email}" does not match an account` };
	}

	const id = env.MCP_USER_ID?.trim();
	if (id) {
		const row = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).get();
		return row ? { id: row.id } : { error: `MCP_USER_ID "${id}" does not match an account` };
	}

	const rows = await db.select({ id: user.id }).from(user).limit(2).all();
	if (rows.length === 1) return { id: rows[0].id };
	if (rows.length === 0) return { error: 'No accounts exist yet; create one in the app first' };
	return { error: 'Multiple accounts exist; set MCP_USER_EMAIL or MCP_USER_ID' };
}

export async function authenticateMcpRequest(request: Request): Promise<McpAuthResult> {
	const token = env.MCP_TOKEN?.trim();
	if (!token || token.length < MIN_TOKEN_LENGTH) {
		return {
			ok: false,
			status: 503,
			error: `MCP is not configured: set MCP_TOKEN to a random string of at least ${MIN_TOKEN_LENGTH} characters`
		};
	}

	const match = BEARER.exec(request.headers.get('authorization') ?? '');
	if (!match) {
		return {
			ok: false,
			status: 401,
			error: 'Missing bearer token',
			headers: { 'WWW-Authenticate': 'Bearer realm="megaorganize-mcp"' }
		};
	}

	if (!(await secretsMatch(match[1].trim(), token))) {
		return {
			ok: false,
			status: 401,
			error: 'Invalid bearer token',
			headers: { 'WWW-Authenticate': 'Bearer realm="megaorganize-mcp"' }
		};
	}

	const resolved = await resolveMcpUserId();
	if ('error' in resolved) {
		return { ok: false, status: 500, error: resolved.error };
	}

	return { ok: true, userId: resolved.id };
}
