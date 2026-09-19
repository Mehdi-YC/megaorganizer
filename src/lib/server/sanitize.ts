/**
 * Server-side input sanitization utilities.
 * Sanitize user inputs before storage to prevent XSS and injection attacks.
 */

/**
 * Sanitize a string input by trimming and removing null bytes.
 * Does NOT escape HTML - use DOMPurify on the client for that.
 */
export function sanitizeString(input: unknown): string {
	if (typeof input !== 'string') return '';
	return input.replace(/\0/g, '').trim();
}

/**
 * Sanitize a string for use in SQL LIKE patterns.
 * Escapes special characters % and _.
 */
export function sanitizeLikePattern(input: string): string {
	return input.replace(/[%_]/g, '\\$&');
}

/**
 * Sanitize a filename by removing dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
	// Remove path separators, null bytes, and other dangerous chars
	return filename
		.replace(/[\/\\:*?"<>|\x00]/g, '_')
		.replace(/\s+/g, '_')
		.substring(0, 255); // Limit length
}

/**
 * Validate and sanitize a URL.
 * Returns null if the URL is invalid or uses a dangerous protocol.
 */
export function sanitizeUrl(url: unknown): string | null {
	if (typeof url !== 'string' || !url.trim()) return null;
	
	const trimmed = url.trim();
	
	// Block dangerous protocols
	const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
	const lower = trimmed.toLowerCase();
	if (dangerousProtocols.some(p => lower.startsWith(p))) {
		return null;
	}
	
	// Allow relative URLs and http/https
	try {
		if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
			return trimmed; // Relative URL
		}
		const parsed = new URL(trimmed);
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
			return trimmed;
		}
		return null;
	} catch {
		// Not a valid URL - might be a relative path
		return trimmed.startsWith('/') ? trimmed : null;
	}
}

/**
 * Sanitize markdown content.
 * Removes potentially dangerous HTML while preserving markdown.
 * Note: Full sanitization should be done on the client with DOMPurify.
 */
export function sanitizeMarkdown(content: unknown): string {
	if (typeof content !== 'string') return '';
	
	// Remove null bytes
	let sanitized = content.replace(/\0/g, '');
	
	// Remove script tags (basic protection - DOMPurify handles the rest)
	sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
	
	// Remove event handlers
	sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
	
	return sanitized;
}

/**
 * Sanitize an integer input.
 * Returns the integer or the default value if invalid.
 */
export function sanitizeInt(input: unknown, defaultValue: number, min?: number, max?: number): number {
	const num = typeof input === 'string' ? parseInt(input, 10) : typeof input === 'number' ? Math.floor(input) : NaN;
	
	if (isNaN(num)) return defaultValue;
	if (min !== undefined && num < min) return min;
	if (max !== undefined && num > max) return max;
	
	return num;
}

/**
 * Sanitize a float input.
 * Returns the float or the default value if invalid.
 */
export function sanitizeFloat(input: unknown, defaultValue: number, min?: number, max?: number): number {
	const num = typeof input === 'string' ? parseFloat(input) : typeof input === 'number' ? input : NaN;
	
	if (isNaN(num)) return defaultValue;
	if (min !== undefined && num < min) return min;
	if (max !== undefined && num > max) return max;
	
	return num;
}