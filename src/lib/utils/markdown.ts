import { Marked } from 'marked';
import hljs from 'highlight.js';

let mermaidReady = false;
let mermaidModule: typeof import('mermaid') | null = null;

async function ensureMermaid() {
	if (mermaidReady) return mermaidModule;
	mermaidModule = await import('mermaid');
	mermaidModule!.initialize({
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
	const html = await marked.parse(text) as string;

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
			el.innerHTML = svg;
		} catch {
			el.innerHTML = `<pre class="mermaid-error">${code}</pre>`;
		}
	}

	return container.innerHTML;
}
