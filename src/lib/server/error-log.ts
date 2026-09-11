/**
 * Lightweight server-side error logger.
 * Logs to stdout (visible in any hosting platform).
 * In production, this could be extended to write to a file or external service.
 */

export function logError(context: string, error: unknown, metadata?: Record<string, unknown>) {
	const timestamp = new Date().toISOString();
	const message = error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : undefined;

	const entry = {
		timestamp,
		level: 'error',
		context,
		message,
		...(stack && { stack }),
		...(metadata && { metadata })
	};

	console.error(`[ERROR] ${timestamp} [${context}] ${message}`, stack ? `\n${stack}` : '', metadata ? JSON.stringify(metadata) : '');
}

export function logWarning(context: string, message: string, metadata?: Record<string, unknown>) {
	const timestamp = new Date().toISOString();
	console.warn(`[WARN] ${timestamp} [${context}] ${message}`, metadata ? JSON.stringify(metadata) : '');
}
