// Pure wikilink syntax helpers shared by the markdown renderer (client) and
// the link extraction service (server). No marked runtime, no DOM.

// `[[Target]]` or `[[Target|label]]`. Newlines and nested brackets end a
// target so a stray `[[` never eats the rest of a paragraph.
export const WIKILINK_RE = /\[\[([^[\]\n|]+?)(?:\|([^[\]\n]+?))?\]\]/g;
// Same pattern, anchored, for the markdown tokenizer.
export const WIKILINK_INLINE_RE = /^\[\[([^[\]\n|]+?)(?:\|([^[\]\n]+?))?\]\]/;

export interface WikilinkRef {
	/** Link destination: a page or tree element name. */
	target: string;
	/** Display text; defaults to target. */
	label: string;
	/** The full `[[...]]` source text. */
	raw: string;
}

export function findWikilinks(markdown: string | null | undefined): WikilinkRef[] {
	if (!markdown) return [];
	const refs: WikilinkRef[] = [];
	const seen = new Set<string>();
	// Strip fenced code blocks and inline code first so example text like
	// `[[like this]]` in docs never becomes a phantom link.
	const stripped = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
	for (const m of stripped.matchAll(WIKILINK_RE)) {
		const target = m[1].trim();
		if (!target || seen.has(target)) continue;
		seen.add(target);
		refs.push({ target, label: (m[2] ?? m[1]).trim(), raw: m[0] });
	}
	return refs;
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Marked inline extension for wikilinks. Resolved targets render as real
 * anchors; unresolved ones render as click-to-resolve spans (see
 * wikilink-click.ts). When the caller passes a resolution map and the target
 * is missing from it, the span gets the `wikilink-unresolved` marker for
 * dangling-link styling.
 */
export function createWikilinkExtension(getLinks: () => Record<string, string | null> | null) {
	return {
		name: 'wikilink',
		level: 'inline' as const,
		start(src: string): number | undefined {
			const i = src.indexOf('[[');
			return i === -1 ? undefined : i;
		},
		tokenizer(
			src: string
		): { type: string; raw: string; target: string; label: string } | undefined {
			const m = WIKILINK_INLINE_RE.exec(src);
			if (!m) return undefined;
			return {
				type: 'wikilink',
				raw: m[0],
				target: m[1].trim(),
				label: (m[2] ?? m[1]).trim()
			};
		},
		renderer(token: { target: string; label: string }): string {
			const links = getLinks();
			const href = links ? links[token.target] : undefined;
			if (href) {
				return `<a class="wikilink text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary" href="${escapeHtml(href)}">${escapeHtml(token.label)}</a>`;
			}
			const dangling = links ? ' wikilink-unresolved decoration-dashed' : '';
			return `<span class="wikilink cursor-pointer text-primary/80 underline decoration-primary/30 underline-offset-2 hover:decoration-primary/70${dangling}" data-wikilink="${escapeHtml(token.target)}" title="Open ${escapeHtml(token.target)}">${escapeHtml(token.label)}</span>`;
		}
	};
}
