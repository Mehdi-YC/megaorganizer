<script lang="ts">
	import type { Attachment } from '$lib/types';
	import { Button, Spinner } from '$lib/components/ui';

	/**
	 * Attachment manager: upload by picker or drag-and-drop, multi-select,
	 * share, delete, and an in-page preview.
	 *
	 * This was lifted out of the category page, which had grown past 1400 lines.
	 * It owns all of its state; the page only passes the initial list and the
	 * page id uploads target.
	 */

	let {
		initialAttachments = [],
		pageId,
		pageName = ''
	}: {
		initialAttachments?: Attachment[];
		pageId: string;
		pageName?: string;
	} = $props();

	// Seeded from the prop once on purpose: uploads and deletes own the list
	// from here on, and re-syncing from the prop would clobber local edits.
	// svelte-ignore state_referenced_locally
	let attachments = $state<Attachment[]>(initialAttachments);
	let selectedAttachments = $state<Set<string>>(new Set());
	let uploading = $state(false);
	let uploadError = $state('');
	let dragOverAttachments = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let previewFile = $state<Attachment | null>(null);

	const MAX_FILE_BYTES = 100 * 1024 * 1024;

	async function uploadFiles(files: FileList | File[]) {
		uploading = true;
		uploadError = '';

		for (const file of Array.from(files)) {
			if (file.size > MAX_FILE_BYTES) {
				uploadError = `${file.name} exceeds 100MB limit`;
				uploading = false;
				return;
			}

			const formData = new FormData();
			formData.append('pageId', pageId);
			formData.append('file', file);

			try {
				const res = await fetch('/api/attachments', { method: 'POST', body: formData });
				if (res.ok) {
					const attachment: Attachment = await res.json();
					attachments = [...attachments, attachment];
				} else {
					const err = await res.json();
					uploadError = err.error || 'Upload failed';
				}
			} catch {
				uploadError = 'Upload failed';
			}
		}

		uploading = false;
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) uploadFiles(input.files);
		// Reset so re-picking the same file fires change again.
		input.value = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOverAttachments = false;
		if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOverAttachments = true;
	}

	function handleDragLeave() {
		dragOverAttachments = false;
	}

	function toggleSelectAttachment(id: string) {
		const next = new Set(selectedAttachments);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedAttachments = next;
	}

	function selectAllAttachments() {
		selectedAttachments =
			selectedAttachments.size === attachments.length
				? new Set()
				: new Set(attachments.map((a) => a.id));
	}

	function clearSelection() {
		selectedAttachments = new Set();
	}

	async function deleteAttachment(id: string) {
		await fetch('/api/attachments', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		attachments = attachments.filter((a) => a.id !== id);
		const next = new Set(selectedAttachments);
		next.delete(id);
		selectedAttachments = next;
	}

	async function deleteSelectedAttachments() {
		for (const id of selectedAttachments) {
			await fetch('/api/attachments', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
		}
		attachments = attachments.filter((a) => !selectedAttachments.has(a.id));
		selectedAttachments = new Set();
	}

	async function shareSelectedAttachments() {
		const files: File[] = [];
		for (const id of selectedAttachments) {
			const att = attachments.find((a) => a.id === id);
			if (!att?.url) continue;
			try {
				const res = await fetch(att.url);
				const blob = await res.blob();
				files.push(new File([blob], att.originalName, { type: att.mimeType }));
			} catch {
				// Skip files that fail to fetch; the rest still share.
			}
		}

		if (files.length === 0) return;

		if (navigator.share && navigator.canShare?.({ files })) {
			try {
				await navigator.share({ files, title: pageName || 'Attachments' });
			} catch {
				// User cancelled, or the share sheet failed.
			}
			return;
		}

		// No share sheet (desktop browsers): download the files instead.
		for (const file of files) {
			const url = URL.createObjectURL(file);
			const a = document.createElement('a');
			a.href = url;
			a.download = file.name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getFileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'fa-image';
		if (mimeType.startsWith('video/')) return 'fa-video';
		if (mimeType === 'application/pdf') return 'fa-file-pdf';
		if (mimeType.startsWith('audio/')) return 'fa-file-audio';
		if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-zipper';
		if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
		if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fa-file-excel';
		return 'fa-file';
	}

	/** Coarse kind used to pick which preview element to render. */
	function previewKind(att: Attachment): string {
		return att.category;
	}
</script>

<div class="mt-6">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
			Attachments ({attachments.length})
		</h3>
		<div class="flex items-center gap-2">
			{#if selectedAttachments.size > 0}
				<span class="text-[10px] text-fg-subdued">{selectedAttachments.size} selected</span>
				<Button size="sm" onclick={shareSelectedAttachments}>
					<i class="fas fa-share-nodes text-[9px]"></i> Share
				</Button>
				<Button size="sm" variant="danger" onclick={deleteSelectedAttachments}>
					<i class="fas fa-trash text-[9px]"></i> Delete
				</Button>
				<Button size="sm" variant="secondary" onclick={clearSelection}>Cancel</Button>
			{:else if attachments.length > 1}
				<Button size="sm" variant="secondary" onclick={selectAllAttachments}>
					<i class="fas fa-check-double text-[9px]"></i> Select All
				</Button>
			{/if}
		</div>
	</div>

	<input type="file" multiple class="hidden" bind:this={fileInput} onchange={handleFileInput} />

	{#if uploadError}
		<div class="mb-3 rounded-sm border border-error/30 bg-error/10 px-3 py-2">
			<p class="text-[11px] text-error">{uploadError}</p>
		</div>
	{/if}

	{#if uploading}
		<div class="mb-3 flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2">
			<Spinner size="sm" />
			<span class="text-[11px] text-fg-subdued">Uploading...</span>
		</div>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="rounded-sm border border-dashed transition-colors {dragOverAttachments
			? 'border-primary bg-primary/5'
			: 'border-border'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
	>
		{#if attachments.length === 0}
			<button
				type="button"
				class="w-full cursor-pointer py-8 text-center"
				onclick={() => fileInput?.click()}
			>
				<i class="fas fa-paperclip mb-2 text-xl text-fg-subdued/40"></i>
				<p class="text-xs text-fg-subdued">Drop files here or click to upload</p>
				<p class="mt-1 text-[10px] text-fg-subdued/60">Max 100MB per file</p>
			</button>
		{:else}
			<div class="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each attachments as att (att.id)}
					<div
						class="group flex items-center gap-2.5 rounded-sm border border-border bg-surface p-2.5 transition-all hover:border-primary/50 {selectedAttachments.has(
							att.id
						)
							? 'border-primary bg-primary/5'
							: ''}"
					>
						<button
							type="button"
							aria-label={selectedAttachments.has(att.id) ? 'Deselect' : 'Select'}
							class="shrink-0 cursor-pointer"
							onclick={() => toggleSelectAttachment(att.id)}
						>
							<div
								class="flex h-5 w-5 items-center justify-center rounded-sm border transition-all {selectedAttachments.has(
									att.id
								)
									? 'border-primary bg-primary text-white'
									: 'border-border bg-bg'}"
							>
								{#if selectedAttachments.has(att.id)}
									<i class="fas fa-check text-[8px]"></i>
								{/if}
							</div>
						</button>
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-2 text-left"
							onclick={() => (previewFile = att)}
						>
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted">
								<i class="fas {getFileIcon(att.mimeType)} text-[10px] text-fg-subdued"></i>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-[11px] font-medium text-fg-accent">{att.originalName}</p>
								<p class="text-[9px] text-fg-subdued">{formatFileSize(att.size)}</p>
							</div>
						</button>
						<button
							type="button"
							aria-label="Delete"
							class="h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
							onclick={() => deleteAttachment(att.id)}
						>
							<i class="fas fa-times text-[9px]"></i>
						</button>
					</div>
				{/each}
			</div>
			<div class="border-t border-border px-3 py-2">
				<button
					type="button"
					class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
					onclick={() => fileInput?.click()}
				>
					<i class="fas fa-plus mr-2 text-xs"></i> Add more files
				</button>
			</div>
		{/if}
	</div>
</div>

{#if previewFile}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay"
		role="presentation"
		onclick={() => (previewFile = null)}
		onkeydown={(e) => e.key === 'Escape' && (previewFile = null)}
	>
		<div
			class="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center rounded-sm border border-border bg-surface shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={previewFile.originalName}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (previewFile = null)}
		>
			<div class="flex w-full items-center justify-between border-b border-border px-4 py-2">
				<p class="max-w-[70%] truncate text-xs font-medium text-fg-accent">
					{previewFile.originalName}
				</p>
				<div class="flex items-center gap-2">
					<Button
						size="sm"
						variant="secondary"
						href={previewFile.url}
						download={previewFile.originalName}
					>
						<i class="fas fa-download text-[9px]"></i> Download
					</Button>
					<button
						type="button"
						aria-label="Close preview"
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
						onclick={() => (previewFile = null)}
					>
						<i class="fas fa-times text-xs"></i>
					</button>
				</div>
			</div>
			<div class="flex-1 overflow-auto p-4">
				{#if previewKind(previewFile) === 'image'}
					<img
						src={previewFile.url}
						alt={previewFile.originalName}
						class="max-h-[75vh] max-w-full rounded-sm object-contain"
					/>
				{:else if previewKind(previewFile) === 'video'}
					<video src={previewFile.url} controls class="max-h-[75vh] max-w-full rounded-sm">
						<track kind="captions" />
					</video>
				{:else if previewKind(previewFile) === 'audio'}
					<div class="flex flex-col items-center gap-4 py-8">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<i class="fas fa-file-audio text-2xl text-fg-subdued"></i>
						</div>
						<audio src={previewFile.url} controls class="w-80"></audio>
					</div>
				{:else if previewKind(previewFile) === 'pdf'}
					<iframe
						src={previewFile.url}
						class="h-[75vh] w-[70vw] rounded-sm border-0"
						title={previewFile.originalName}
					></iframe>
				{:else}
					<div class="flex flex-col items-center gap-4 py-12">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<i class="fas {getFileIcon(previewFile.mimeType)} text-2xl text-fg-subdued"></i>
						</div>
						<p class="text-xs text-fg-subdued">Preview not available for this file type</p>
						<Button href={previewFile.url} download={previewFile.originalName}>
							<i class="fas fa-download text-[10px]"></i> Download to view
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
