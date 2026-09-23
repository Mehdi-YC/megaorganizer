import { Marked } from 'marked';
import type { RendererExtension, TokenizerExtension } from 'marked';
import DOMPurify from 'dompurify';
import { createWikilinkExtension, escapeHtml } from '$lib/utils/wikilink';

let mermaidReady = false;
let mermaidModule: any = null;
let hljsReady = false;
let hljsModule: any = null;

async function ensureMermaid() {
	if (mermaidReady) return mermaidModule;
	mermaidModule = await import('mermaid');
	mermaidModule.initialize({
		startOnLoad: false,
		theme: 'dark',
		backgroundColor: 'transparent'
	});
	mermaidReady = true;
	return mermaidModule;
}

async function ensureHljs() {
	if (hljsReady) return hljsModule;
	hljsModule = (await import('highlight.js')).default;
	hljsReady = true;
	return hljsModule;
}

const marked = new Marked();
let mermaidIdCounter = 0;

// Resolution map for `[[wikilinks]]` set per renderMarkdown call. The parse
// is synchronous, so this cannot leak across renders. A null map means the
// caller has no resolutions (list cards); links render as click-to-resolve
// spans there instead of resolved anchors.
let currentLinks: Record<string, string | null> | null = null;

marked.use({
	extensions: [
		createWikilinkExtension(() => currentLinks) as unknown as TokenizerExtension & RendererExtension
	]
});

marked.use({
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			if (lang === 'mermaid') {
				const id = `mermaid-${++mermaidIdCounter}`;
				return `<div class="mermaid" data-mermaid-id="${id}">${escapeHtml(text)}</div>`;
			}
			let highlighted: string;
			if (hljsModule && lang && hljsModule.getLanguage(lang)) {
				try {
					highlighted = hljsModule.highlight(text, { language: lang }).value;
				} catch {
					highlighted = text;
				}
			} else if (hljsModule) {
				highlighted = hljsModule.highlightAuto(text).value;
			} else {
				highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			}
			const langClass = lang ? ` language-${escapeHtml(lang)}` : '';
			return `<pre><code class="hljs${langClass}">${highlighted}\n</code></pre>`;
		}
	}
});

export async function renderMarkdown(
	text: string,
	links?: Record<string, string | null>
): Promise<string> {
	if (!text) return '';
	currentLinks = links ?? null;
	// The code renderer runs synchronously inside marked.parse, so the
	// highlighter must be loaded before parsing whenever fences are present.
	if (text.includes('```')) await ensureHljs();
	const rawHtml = (await marked.parse(text)) as string;
	const html = DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			's',
			'del',
			'a',
			'img',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'blockquote',
			'pre',
			'code',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'div',
			'span',
			'sup',
			'sub',
			'details',
			'summary',
			'input',
			'svg',
			'path',
			'circle',
			'rect',
			'line',
			'polyline',
			'polygon',
			'g',
			'defs',
			'clipPath',
			'marker',
			'foreignObject'
		],
		ALLOWED_ATTR: [
			'href',
			'src',
			'alt',
			'title',
			'class',
			'id',
			'style',
			'width',
			'height',
			'viewBox',
			'xmlns',
			'fill',
			'stroke',
			'stroke-width',
			'stroke-linecap',
			'stroke-linejoin',
			'd',
			'transform',
			'x',
			'y',
			'cx',
			'cy',
			'r',
			'rx',
			'ry',
			'x1',
			'y1',
			'x2',
			'y2',
			'points',
			'markerUnits',
			'refX',
			'refY',
			'markerWidth',
			'markerHeight',
			'orient',
			'data-mermaid-id',
			'data-wikilink',
			'checked',
			'type',
			'disabled',
			'text-anchor',
			'dominant-baseline',
			'font-size',
			'font-family',
			'clip-path',
			'fill-opacity',
			'stroke-opacity',
			'opacity'
		]
	});

	if (!html.includes('data-mermaid-id')) return html;

	const container = document.createElement('div');
	container.innerHTML = html;

	const mermaidDivs = container.querySelectorAll('.mermaid');
	if (mermaidDivs.length === 0) return html;

	const mermaid = await ensureMermaid();

	for (const el of mermaidDivs) {
		const code = el.textContent || '';
		const id = el.getAttribute('data-mermaid-id') || `mermaid-${Date.now()}`;
		try {
			const { svg } = await mermaid.render(id, code);
			el.innerHTML = DOMPurify.sanitize(svg, {
				ALLOWED_TAGS: [
					'svg',
					'g',
					'path',
					'circle',
					'rect',
					'line',
					'polyline',
					'polygon',
					'text',
					'tspan',
					'defs',
					'clipPath',
					'marker',
					'foreignObject',
					'style',
					'linearGradient',
					'radialGradient',
					'stop',
					'use',
					'image'
				],
				ALLOWED_ATTR: [
					'viewBox',
					'xmlns',
					'class',
					'style',
					'id',
					'width',
					'height',
					'd',
					'transform',
					'fill',
					'stroke',
					'stroke-width',
					'opacity',
					'x',
					'y',
					'cx',
					'cy',
					'r',
					'rx',
					'ry',
					'x1',
					'y1',
					'x2',
					'y2',
					'points',
					'text-anchor',
					'dominant-baseline',
					'font-size',
					'font-family',
					'clip-path',
					'markerUnits',
					'refX',
					'refY',
					'markerWidth',
					'markerHeight',
					'orient',
					'dx',
					'dy',
					'href',
					'src',
					'data-id'
				]
			});
		} catch {
			// `code` survived sanitization as text; assigning it via innerHTML
			// would re-parse it as HTML (stored XSS). textContent keeps it text.
			const pre = document.createElement('pre');
			pre.className = 'mermaid-error';
			pre.textContent = code;
			el.replaceChildren(pre);
		}
	}

	return container.innerHTML;
}
