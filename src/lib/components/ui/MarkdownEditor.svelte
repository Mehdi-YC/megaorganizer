<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';
	import { onMount } from 'svelte';

	let {
		value = $bindable(''),
		placeholder = 'Write markdown content...',
		rows = 8,
		minHeight = '180px',
		class: className = '',
		showToolbar = true,
		mode = $bindable<'write' | 'preview' | 'split'>('write'),
		onSave = undefined,
		docLinks = undefined
	}: {
		value?: string;
		placeholder?: string;
		rows?: number;
		minHeight?: string;
		class?: string;
		showToolbar?: boolean;
		mode?: 'write' | 'preview' | 'split';
		onSave?: () => void;
		docLinks?: Record<string, string | null>;
	} = $props();

	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let previewHtml = $state('');
	let isFullscreen = $state(false);
	let renderTimer: ReturnType<typeof setTimeout> | undefined;

	let wordCount = $derived(value.trim() ? value.trim().split(/\s+/).length : 0);
	let charCount = $derived(value.length);

	async function updatePreview() {
		try {
			previewHtml = await renderMarkdown(value, docLinks);
		} catch {
			previewHtml = '<p class="text-error text-xs">Error rendering preview</p>';
		}
	}

	$effect(() => {
		// Re-render when value or mode changes
		if (mode === 'preview' || mode === 'split') {
			clearTimeout(renderTimer);
			renderTimer = setTimeout(updatePreview, 100);
		}
	});

	onMount(() => {
		if (mode !== 'write') {
			updatePreview();
		}
		return () => clearTimeout(renderTimer);
	});

	function wrapSelection(before: string, after: string, defaultText = 'text') {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selected = value.slice(start, end);

		const insert = selected || defaultText;
		const replacement = `${before}${insert}${after}`;
		value = value.slice(0, start) + replacement + value.slice(end);

		// Restore selection to inside wrap
		requestAnimationFrame(() => {
			if (!textareaEl) return;
			textareaEl.focus();
			textareaEl.selectionStart = start + before.length;
			textareaEl.selectionEnd = start + before.length + insert.length;
		});
	}

	function insertPrefix(prefix: string) {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;
		value = value.slice(0, lineStart) + prefix + value.slice(lineStart);

		requestAnimationFrame(() => {
			if (!textareaEl) return;
			textareaEl.focus();
			const newPos = start + prefix.length;
			textareaEl.selectionStart = newPos;
			textareaEl.selectionEnd = newPos;
		});
	}

	function insertBlock(block: string) {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const needsNewlineBefore = start > 0 && value[start - 1] !== '\n';
		const needsNewlineAfter = end < value.length && value[end] !== '\n';

		const textToInsert = `${needsNewlineBefore ? '\n\n' : ''}${block}${needsNewlineAfter ? '\n\n' : ''}`;
		value = value.slice(0, start) + textToInsert + value.slice(end);

		requestAnimationFrame(() => {
			if (!textareaEl) return;
			textareaEl.focus();
			const pos = start + textToInsert.length;
			textareaEl.selectionStart = pos;
			textareaEl.selectionEnd = pos;
		});
	}

	function insertLink() {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selected = value.slice(start, end);
		if (selected) {
			wrapSelection('[', '](https://)', selected);
		} else {
			wrapSelection('[', '](https://)', 'Link title');
		}
	}

	function insertTable() {
		insertBlock(
			'| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |'
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Save shortcut Ctrl+S / Cmd+S
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			if (onSave) {
				onSave();
			}
			return;
		}

		// Bold Ctrl+B
		if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
			e.preventDefault();
			wrapSelection('**', '**', 'bold text');
			return;
		}

		// Italic Ctrl+I
		if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
			e.preventDefault();
			wrapSelection('*', '*', 'italic text');
			return;
		}

		// Link Ctrl+K
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			insertLink();
			return;
		}

		// Escape exits fullscreen
		if (e.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
			return;
		}

		// Tab support for indentation
		if (e.key === 'Tab') {
			e.preventDefault();
			if (!textareaEl) return;
			const start = textareaEl.selectionStart;
			const end = textareaEl.selectionEnd;

			if (e.shiftKey) {
				// Dedent: remove 2 spaces from current line
				const lineStart = value.lastIndexOf('\n', start - 1) + 1;
				if (value.slice(lineStart, lineStart + 2) === '  ') {
					value = value.slice(0, lineStart) + value.slice(lineStart + 2);
					textareaEl.selectionStart = Math.max(lineStart, start - 2);
					textareaEl.selectionEnd = Math.max(lineStart, end - 2);
				}
			} else {
				// Indent: insert 2 spaces
				value = value.slice(0, start) + '  ' + value.slice(end);
				textareaEl.selectionStart = start + 2;
				textareaEl.selectionEnd = start + 2;
			}
		}
	}
</script>

<div
	class="relative flex flex-col rounded-xl border border-border bg-surface transition-all {isFullscreen
		? 'fixed inset-0 z-50 rounded-none border-none bg-surface p-4 shadow-2xl sm:p-6'
		: ''} {className}"
>
	{#if showToolbar}
		<!-- Toolbar Header -->
		<div
			class="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/70 bg-muted/30 px-3 py-2 text-xs"
		>
			<!-- Formatting tools -->
			<div class="no-scrollbar flex max-w-full flex-wrap items-center gap-0.5 overflow-x-auto">
				<!-- Bold -->
				<button
					type="button"
					onclick={() => wrapSelection('**', '**', 'bold text')}
					title="Bold (Ctrl+B)"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-bold text-xs"></i>
				</button>

				<!-- Italic -->
				<button
					type="button"
					onclick={() => wrapSelection('*', '*', 'italic text')}
					title="Italic (Ctrl+I)"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-italic text-xs"></i>
				</button>

				<!-- Strikethrough -->
				<button
					type="button"
					onclick={() => wrapSelection('~~', '~~', 'strikethrough')}
					title="Strikethrough"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-strikethrough text-xs"></i>
				</button>

				<div class="mx-1 h-3.5 w-px bg-border/60"></div>

				<!-- Headings -->
				<button
					type="button"
					onclick={() => insertPrefix('# ')}
					title="Heading 1"
					class="flex h-7 items-center justify-center rounded px-1.5 text-[11px] font-bold text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					H1
				</button>
				<button
					type="button"
					onclick={() => insertPrefix('## ')}
					title="Heading 2"
					class="flex h-7 items-center justify-center rounded px-1.5 text-[11px] font-bold text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					H2
				</button>
				<button
					type="button"
					onclick={() => insertPrefix('### ')}
					title="Heading 3"
					class="flex h-7 items-center justify-center rounded px-1.5 text-[11px] font-bold text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					H3
				</button>

				<div class="mx-1 h-3.5 w-px bg-border/60"></div>

				<!-- Lists -->
				<button
					type="button"
					onclick={() => insertPrefix('- ')}
					title="Bullet List"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-list-ul text-xs"></i>
				</button>
				<button
					type="button"
					onclick={() => insertPrefix('1. ')}
					title="Numbered List"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-list-ol text-xs"></i>
				</button>
				<button
					type="button"
					onclick={() => insertPrefix('- [ ] ')}
					title="Task List"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-tasks text-xs"></i>
				</button>

				<div class="mx-1 h-3.5 w-px bg-border/60"></div>

				<!-- Quote & Code -->
				<button
					type="button"
					onclick={() => insertPrefix('> ')}
					title="Quote"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-quote-left text-xs"></i>
				</button>
				<button
					type="button"
					onclick={() => wrapSelection('`', '`', 'code')}
					title="Inline Code"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-code text-xs"></i>
				</button>
				<button
					type="button"
					onclick={() => insertBlock('```typescript\n// code here\n```')}
					title="Fenced Code Block"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-file-code text-xs"></i>
				</button>

				<div class="mx-1 h-3.5 w-px bg-border/60"></div>

				<!-- Link, Table, Wikilink -->
				<button
					type="button"
					onclick={insertLink}
					title="Insert Link (Ctrl+K)"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-link text-xs"></i>
				</button>
				<button
					type="button"
					onclick={insertTable}
					title="Insert Table"
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					<i class="fas fa-table text-xs"></i>
				</button>
				<button
					type="button"
					onclick={() => wrapSelection('[[', ']]', 'Page/Item Name')}
					title="Wikilink [[Target]]"
					class="flex h-7 items-center justify-center rounded px-1.5 font-mono text-[11px] text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				>
					[[wiki]]
				</button>
			</div>

			<!-- View Mode Switcher & Fullscreen -->
			<div class="ml-auto flex items-center gap-1.5">
				<div class="inline-flex rounded-lg border border-border/60 bg-muted/50 p-0.5 text-xs">
					<button
						type="button"
						onclick={() => (mode = 'write')}
						class="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors {mode ===
						'write'
							? 'bg-surface font-semibold text-fg shadow-2xs'
							: 'text-fg-subdued hover:text-fg'}"
						title="Markdown Editor"
					>
						<i class="fas fa-pen text-[9px]"></i>
						<span>Write</span>
					</button>

					<button
						type="button"
						onclick={() => {
							mode = 'split';
							updatePreview();
						}}
						class="hidden items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors sm:flex {mode ===
						'split'
							? 'bg-surface font-semibold text-fg shadow-2xs'
							: 'text-fg-subdued hover:text-fg'}"
						title="Side-by-side Editor & WYSIWYG Preview"
					>
						<i class="fas fa-columns text-[9px]"></i>
						<span>Split</span>
					</button>

					<button
						type="button"
						onclick={() => {
							mode = 'preview';
							updatePreview();
						}}
						class="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors {mode ===
						'preview'
							? 'bg-surface font-semibold text-fg shadow-2xs'
							: 'text-fg-subdued hover:text-fg'}"
						title="Live WYSIWYG Output"
					>
						<i class="fas fa-eye text-[9px]"></i>
						<span>Preview</span>
					</button>
				</div>

				<button
					type="button"
					onclick={() => (isFullscreen = !isFullscreen)}
					class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}
				>
					<i class="fas {isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs"></i>
				</button>
			</div>
		</div>
	{/if}

	<!-- Editor / Preview Body -->
	<div
		class="relative flex flex-1 overflow-hidden {mode === 'split'
			? 'grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0'
			: ''}"
		style={isFullscreen ? 'min-height: calc(100vh - 120px);' : `min-height: ${minHeight};`}
	>
		<!-- Write / Textarea pane -->
		{#if mode === 'write' || mode === 'split'}
			<div class="relative flex flex-1 flex-col">
				<textarea
					bind:this={textareaEl}
					bind:value
					{placeholder}
					{rows}
					onkeydown={handleKeydown}
					class="w-full flex-1 resize-y bg-transparent p-3.5 font-mono text-xs leading-relaxed text-fg placeholder:text-fg-subdued/60 focus:ring-0 focus:outline-none sm:text-sm"
					style={isFullscreen ? 'height: 100%; resize: none;' : `min-height: ${minHeight};`}
				></textarea>
			</div>
		{/if}

		<!-- WYSIWYG Preview pane -->
		{#if mode === 'preview' || mode === 'split'}
			<div
				class="flex-1 overflow-y-auto bg-muted/10 p-4 {mode === 'split' ? 'hidden sm:block' : ''}"
				style={isFullscreen ? 'height: 100%;' : `min-height: ${minHeight};`}
			>
				{#if previewHtml}
					<div class="markdown-content text-xs leading-relaxed text-fg sm:text-sm">
						{@html previewHtml}
					</div>
				{:else}
					<div class="py-8 text-center text-xs text-fg-subdued/70 italic">
						Nothing to preview yet. Start typing to see formatted WYSIWYG output.
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Status Footer -->
	<div
		class="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] text-fg-subdued"
	>
		<div class="flex items-center gap-3">
			<span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
			<span>{charCount} characters</span>
		</div>

		<div class="flex items-center gap-2">
			{#if onSave}
				<span class="hidden text-[10px] text-fg-subdued/70 sm:inline">Press Ctrl+S to save</span>
			{/if}
			<span class="text-[10px] text-fg-subdued/80">Markdown & [[wiki]] ready</span>
		</div>
	</div>
</div>
