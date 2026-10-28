import type { RequestHandler } from './$types';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcpRequest } from '$lib/server/mcp/auth';
import { createMcpServer } from '$lib/server/mcp/server';
import { checkRateLimit } from '$lib/server/rate-limit';

// Stateless Streamable HTTP MCP endpoint. Each POST gets its own server and
// transport bound to the account behind the bearer token, so no session state
// is kept between requests and a restart cannot strand a client.
//
// Auth is a static token from the environment (see mcp/auth.ts), not the app
// session cookie. hooks.server.ts skips its cookie check for this path.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function methodNotAllowed(): Response {
	return new Response(JSON.stringify({ error: 'Use POST for MCP requests' }), {
		status: 405,
		headers: { ...JSON_HEADERS, Allow: 'POST' }
	});
}

export const POST: RequestHandler = async ({ request }) => {
	const auth = await authenticateMcpRequest(request);
	if (!auth.ok) {
		return new Response(JSON.stringify({ error: auth.error }), {
			status: auth.status,
			headers: { ...JSON_HEADERS, ...auth.headers }
		});
	}

	// Tool calls are cheap local queries, but a runaway agent should not be
	// able to pin the database. Same in-process limiter as the REST API.
	const { allowed, retryAfterMs } = checkRateLimit(`mcp:${auth.userId}`, 120, 60_000);
	if (!allowed) {
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				...JSON_HEADERS,
				'Retry-After': String(Math.ceil(retryAfterMs / 1000))
			}
		});
	}

	const server = createMcpServer(auth.userId);
	const transport = new WebStandardStreamableHTTPServerTransport({
		// Stateless: no Mcp-Session-Id, no in-memory session table.
		sessionIdGenerator: undefined,
		// Plain JSON responses instead of an SSE stream. Simpler through
		// reverse proxies and enough for request/response tool calls.
		enableJsonResponse: true
	});

	try {
		await server.connect(transport);
		const response = await transport.handleRequest(request);
		response.headers.set('Cache-Control', 'no-store');
		return response;
	} finally {
		await server.close().catch(() => {});
	}
};

export const GET: RequestHandler = async () => methodNotAllowed();
export const DELETE: RequestHandler = async () => methodNotAllowed();
