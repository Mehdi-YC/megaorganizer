import { showToast } from './toast.svelte';

let installed = false;

function requestPath(input: RequestInfo | URL): string | null {
	try {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		return new URL(url, window.location.origin).pathname;
	} catch {
		return null;
	}
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const body = await response.json();
		if (typeof body?.error === 'string') return body.error;
		if (typeof body?.message === 'string') return body.message;
	} catch {
		// Non-JSON responses use the status fallback below.
	}
	return `Request failed (${response.status})`;
}

/**
 * Turn failed API mutations into a visible toast. Pages still make their own
 * decisions on `res.ok`; this only stops failures from looking like dead
 * clicks. GET requests stay quiet because some callers probe optional data.
 */
export function installFetchErrorToasts(): () => void {
	if (typeof window === 'undefined' || installed) return () => {};
	installed = true;

	const originalFetch = window.fetch;
	window.fetch = async (input, init) => {
		const response = await originalFetch(input, init);

		const method = (
			init?.method ?? (input instanceof Request ? input.method : 'GET')
		).toUpperCase();
		if (method === 'GET') return response;

		const path = requestPath(input);
		if (!path || !path.startsWith('/api/') || response.ok) return response;

		const message =
			response.status === 401
				? 'Your session expired. Reload to sign in again.'
				: await readErrorMessage(response.clone());
		showToast(message, 'error', response.status === 401 ? 8000 : 5000);

		return response;
	};

	return () => {
		window.fetch = originalFetch;
		installed = false;
	};
}
