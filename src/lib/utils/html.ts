/**
 * Escape a value for interpolation into an HTML string.
 *
 * Used by server-generated documents (invoice export) where Svelte's own
 * escaping does not apply. Values come from the account's own data — client
 * names, line descriptions, notes — but the document is opened standalone,
 * so unescaped markup would run there.
 */
export function escapeHtml(value: unknown): string {
	return String(value ?? '').replace(
		/[&<>"']/g,
		(char) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string
	);
}
