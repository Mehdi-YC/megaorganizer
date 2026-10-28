const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Prevent duplicate intervals on HMR reload
const CLEANUP_KEY = '__rateLimitCleanup';
const globalStore = globalThis as typeof globalThis & Record<string, boolean>;
if (!globalStore[CLEANUP_KEY]) {
	globalStore[CLEANUP_KEY] = true;
	setInterval(
		() => {
			const now = Date.now();
			for (const [key, entry] of attempts) {
				if (now > entry.resetAt) attempts.delete(key);
			}
		},
		5 * 60 * 1000
	);
}

export function checkRateLimit(
	key: string,
	maxAttempts?: number,
	windowMs?: number
): { allowed: boolean; retryAfterMs: number } {
	const now = Date.now();
	const entry = attempts.get(key);
	const max = maxAttempts ?? MAX_ATTEMPTS;
	const window = windowMs ?? WINDOW_MS;

	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + window });
		return { allowed: true, retryAfterMs: 0 };
	}

	entry.count++;
	if (entry.count > max) {
		return { allowed: false, retryAfterMs: entry.resetAt - now };
	}

	return { allowed: true, retryAfterMs: 0 };
}

/**
 * Inspect a bucket without consuming an attempt. Used where only failures
 * should count toward a lockout (for example repeated bad credentials).
 */
export function rateLimitStatus(
	key: string,
	maxAttempts?: number
): { exceeded: boolean; retryAfterMs: number } {
	const entry = attempts.get(key);
	if (!entry) return { exceeded: false, retryAfterMs: 0 };

	const now = Date.now();
	if (now > entry.resetAt) {
		attempts.delete(key);
		return { exceeded: false, retryAfterMs: 0 };
	}

	const max = maxAttempts ?? MAX_ATTEMPTS;
	return { exceeded: entry.count >= max, retryAfterMs: entry.resetAt - now };
}

export function resetRateLimit(key: string) {
	attempts.delete(key);
}
