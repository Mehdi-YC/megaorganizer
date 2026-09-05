import { Marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

let mermaidReady = false;
let mermaidModule: any = null;

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

const marked = new Marked();
let mermaidIdCounter = 0;

marked.use({
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			if (lang === 'mermaid') {
				const id = `mermaid-${++mermaidIdCounter}`;
				return `<div class="mermaid" data-mermaid-id="${id}">${text}</div>`;
			}
			let highlighted: string;
			if (lang && hljs.getLanguage(lang)) {
				try {
					highlighted = hljs.highlight(text, { language: lang }).value;
				} catch {
					highlighted = text;
				}
			} else {
				highlighted = hljs.highlightAuto(text).value;
			}
			const langClass = lang ? ` language-${lang}` : '';
			return `<pre><code class="hljs${langClass}">${highlighted}\n</code></pre>`;
		}
	}
});

export async function renderMarkdown(text: string): Promise<string> {
	if (!text) return '';
	const rawHtml = await marked.parse(text) as string;
	const html = DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS: [
			'p', 'br', 'strong', 'em', 'u', 's', 'del', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
			'div', 'span', 'sup', 'sub', 'details', 'summary', 'input', 'svg', 'path', 'circle', 'rect',
			'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath', 'marker', 'foreignObject'
		],
		ALLOWED_ATTR: [
			'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'width', 'height',
			'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
			'd', 'transform', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
			'points', 'markerUnits', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient',
			'data-mermaid-id', 'checked', 'type', 'disabled',
			'text-anchor', 'dominant-baseline', 'font-size', 'font-family',
			'clip-path', 'fill-opacity', 'stroke-opacity', 'opacity'
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
					'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
					'text', 'tspan', 'defs', 'clipPath', 'marker', 'foreignObject',
					'style', 'linearGradient', 'radialGradient', 'stop', 'use', 'image'
				],
				ALLOWED_ATTR: [
					'viewBox', 'xmlns', 'class', 'style', 'id', 'width', 'height',
					'd', 'transform', 'fill', 'stroke', 'stroke-width', 'opacity',
					'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
					'points', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family',
					'clip-path', 'markerUnits', 'refX', 'refY', 'markerWidth', 'markerHeight',
					'orient', 'dx', 'dy', 'href', 'src', 'data-id'
				]
			});
		} catch {
			el.innerHTML = `<pre class="mermaid-error">${code}</pre>`;
		}
	}

	return container.innerHTML;
}
