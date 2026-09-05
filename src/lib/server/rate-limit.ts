const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Cleanup stale entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of attempts) {
		if (now > entry.resetAt) attempts.delete(key);
	}
}, 5 * 60 * 1000);

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
	const now = Date.now();
	const entry = attempts.get(key);

	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return { allowed: true, retryAfterMs: 0 };
	}

	entry.count++;
	if (entry.count > MAX_ATTEMPTS) {
		return { allowed: false, retryAfterMs: entry.resetAt - now };
	}

	return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
	attempts.delete(key);
}
