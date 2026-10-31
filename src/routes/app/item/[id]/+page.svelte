<script lang="ts">
	import { resolve } from '$app/paths';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { getTagIds, toggleArrayItem } from '$lib/utils';
	import { YdkDeckViewer, ChildItemList, TagPicker } from '$lib/components/item';
	import MindMap from '$lib/components/ui/MindMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ItemImage from '$lib/components/ui/ItemImage.svelte';
	import BacklinksPanel from '$lib/components/ui/BacklinksPanel.svelte';
	import type { Tag, TreeElement, TreeElementNode } from '$lib/types';

	type ItemUpdate = {
		id: string;
		name: string;
		description: string;
		markdown: string;
		imageUrl: string;
		videoUrl: string;
		externalUrl: string;
		tags: string;
		ydkData?: string;
	};

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let item = $state(data.item);
	// svelte-ignore state_referenced_locally
	let children = $state(data.children ?? []);
	let allTags = $state<Tag[]>([]);
	let editing = $state(false);
	// svelte-ignore state_referenced_locally
	let name = $state(item?.name ?? '');
	// svelte-ignore state_referenced_locally
	let description = $state(item?.description ?? '');
	// svelte-ignore state_referenced_locally
	let content = $state(item?.markdown ?? '');
	// svelte-ignore state_referenced_locally
	let imageUrl = $state(item?.imageUrl ?? '');
	// svelte-ignore state_referenced_locally
	let videoUrl = $state(item?.videoUrl ?? '');
	// svelte-ignore state_referenced_locally
	let externalUrl = $state(item?.externalUrl ?? '');
	// svelte-ignore state_referenced_locally
	let tagIds = $state<string[]>(getTagIds(item ?? {}));
	// svelte-ignore state_referenced_locally
	let ydkData = $state(item?.ydkData ?? '');
	let ydkInput = $state('');
	// svelte-ignore state_referenced_locally
	let ydkEnabled = $state(!!item?.ydkData);
	let showTree = $state(false);
	let subtree = $state<TreeElementNode[]>([]);
	// svelte-ignore state_referenced_locally
	let favorite = $state(item?.favorite ?? false);

	let isDeck = $derived(!!ydkData);
	let isDeckView = $derived(isDeck && !editing);

	let hasUnsavedChanges = $derived(
		editing &&
			(name !== (item?.name ?? '') ||
				description !== (item?.description ?? '') ||
				content !== (item?.markdown ?? '') ||
				imageUrl !== (item?.imageUrl ?? '') ||
				videoUrl !== (item?.videoUrl ?? '') ||
				externalUrl !== (item?.externalUrl ?? '') ||
				ydkData !== (item?.ydkData ?? '') ||
				JSON.stringify(tagIds) !== JSON.stringify(getTagIds(item ?? {})))
	);

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges && !window.confirm('Discard unsaved changes to this item?')) {
			cancel();
		}
	});
	// Only http(s) URLs may be rendered as links (blocks javascript: click-XSS)
	let externalHref = $derived(item ? safeHttpUrl(item.externalUrl) : null);
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
	let renderedContent = $state('');

	$effect(() => {
		renderMarkdown(content, data.links).then((html) => {
			renderedContent = html;
		});
	});

	onMount(async () => {
		const t = await fetch('/api/tags').then((r) => r.json());
		allTags = t;
	});

	function resetForm() {
		editing = false;
		if (!item) return;
		name = item.name;
		description = item.description ?? '';
		content = item.markdown ?? '';
		imageUrl = item.imageUrl ?? '';
		videoUrl = item.videoUrl ?? '';
		externalUrl = item.externalUrl ?? '';
		tagIds = getTagIds(item);
		ydkData = item.ydkData ?? '';
		ydkEnabled = !!item.ydkData;
	}

	async function saveItem() {
		if (!item) return;
		const body: ItemUpdate = {
			id: item.id,
			name,
			description,
			markdown: content,
			imageUrl,
			videoUrl,
			externalUrl,
			tags: JSON.stringify(tagIds)
		};
		if (ydkEnabled && ydkData) body.ydkData = ydkData;
		else if (!ydkEnabled) body.ydkData = '';
		const res = await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (res.ok) {
			editing = false;
			item = { ...item, ...body };
		}
	}

	async function deleteItem() {
		if (!(await confirmAction('Delete this item?'))) return;
		const res = await fetch('/api/tree', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: item?.id })
		});
		if (res.ok) goto(resolve('/app/library'));
	}

	function toggleTag(tagId: string) {
		tagIds = toggleArrayItem(tagIds, tagId);
	}

	function handleChildAdd(child: TreeElement) {
		children = [...children, child];
	}

	function handleChildRemove(childId: string) {
		children = children.filter((c) => c.id !== childId);
	}

	function handleChildReorder(fromIdx: number, toIdx: number) {
		const next = [...children];
		const [moved] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, moved);
		children = next;
	}

	function safeHttpUrl(url: string | null | undefined): string | null {
		return url && /^https?:\/\//i.test(url) ? url : null;
	}

	function toggleTreeView() {
		showTree = !showTree;
		if (showTree && subtree.length === 0 && item) {
			fetch(`/api/tree?subtree=${item.id}`)
				.then((r) => r.json())
				.then((data) => {
					subtree = Array.isArray(data) ? data : [];
				})
				.catch(() => {
					subtree = [];
				});
		}
	}

	function handleMindmapNodeClick(node: TreeElementNode) {
		if (node.type === 'item') goto(resolve('/app/item/[id]', { id: node.id }));
	}

	function parseYdk(text: string) {
		const lines = text.split('\n').map((l) => l.trim());
		let mainDeck: string[] = [],
			extraDeck: string[] = [],
			sideDeck: string[] = [],
			section = '';
		for (const line of lines) {
			if (line === '#main') section = 'main';
			else if (line === '#extra') section = 'extra';
			else if (line === '!side') section = 'side';
			else if (line && /^\d+$/.test(line)) {
				if (section === 'main') mainDeck.push(line);
				else if (section === 'extra') extraDeck.push(line);
				else if (section === 'side') sideDeck.push(line);
			}
		}
		return { mainDeck, extraDeck, sideDeck };
	}

	function applyYdkPaste() {
		if (!ydkInput.trim()) return;
		const parsed = parseYdk(ydkInput);
		ydkData = JSON.stringify(parsed);
		ydkEnabled = true;
		ydkInput = '';
	}

	function handleYdkFileImport(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			ydkInput = reader.result as string;
			applyYdkPaste();
		};
		reader.readAsText(file);
		input.value = '';
	}

	function clearYdk() {
		ydkData = '';
		ydkEnabled = false;
		ydkInput = '';
	}

	async function toggleFavorite() {
		if (!item) return;
		const newVal = !favorite;
		favorite = newVal;
		const res = await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: item.id, favorite: newVal })
		});
		if (res.ok) item = { ...item, favorite: newVal };
		else favorite = !newVal;
	}
</script>

<svelte:head><title>{item?.name || 'Item'} - MegaOrganize</title></svelte:head>

<svelte:window
	onbeforeunload={(event) => {
		if (hasUnsavedChanges) event.preventDefault();
	}}
/>

{#if !item}
	<div class="flex h-full items-center justify-center">
		<EmptyState icon="fa-exclamation-triangle" message="Item not found">
			<Button href="/app/library" variant="primary" size="sm">Back to Library</Button>
		</EmptyState>
	</div>
{:else}
	<div class="flex min-h-full flex-col lg:h-full">
		<div
			class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/50 px-4 backdrop-blur-xs sm:px-6 lg:px-8"
		>
			<div class="flex min-w-0 items-center gap-2.5">
				<button
					type="button"
					aria-label="Go back"
					class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={() => history.back()}
				>
					<i class="fas fa-arrow-left text-xs"></i>
				</button>
				<i class="fas fa-chevron-right text-[10px] text-fg-subdued/50"></i>
				{#if editing}
					<input
						type="text"
						bind:value={name}
						class="rounded-lg border border-border bg-bg px-2.5 py-1 text-sm font-semibold text-fg focus:border-primary focus:outline-none"
						placeholder="Item name"
					/>
				{:else}
					<span
						class="cursor-help truncate text-sm font-semibold text-fg sm:text-base"
						title={item.description || item.name}
					>
						{item.name}
					</span>
					<span
						class="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-fg-subdued capitalize"
					>
						{item.type}
					</span>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-1.5">
				{#if editing}
					<Button variant="primary" size="sm" onclick={saveItem}>
						<i class="fas fa-check mr-1.5 text-xs"></i> Save
					</Button>
					<Button variant="secondary" size="sm" onclick={resetForm}>Cancel</Button>
				{:else}
					{#if !isDeckView}
						<button
							type="button"
							aria-label="Toggle tree view"
							title={showTree ? 'Switch to standard view' : 'Switch to tree view'}
							class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors {showTree
								? 'bg-primary text-white'
								: 'border border-border bg-surface text-fg-subdued hover:bg-muted hover:text-fg'}"
							onclick={toggleTreeView}
						>
							<i class="fas fa-project-diagram text-xs"></i>
						</button>
					{/if}
					<Button
						variant="secondary"
						size="sm"
						aria-label="Edit"
						title="Edit item"
						onclick={() => (editing = true)}
					>
						<i class="fas fa-pen text-xs"></i>
					</Button>
					<Button
						variant="danger"
						size="sm"
						aria-label="Delete"
						title="Delete item"
						onclick={deleteItem}
					>
						<i class="fas fa-trash text-xs"></i>
					</Button>
				{/if}
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-4 pt-6 sm:p-6 sm:pt-6 lg:p-8 lg:pt-6">
			<div class="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
				<div class="min-w-0 flex-1 space-y-6 {isDeckView ? 'order-1' : 'order-2'} lg:order-1">
					{#if editing}
						<div class="rounded-xl border border-border bg-surface p-5 shadow-xs">
							<label
								for="item-desc-input"
								class="mb-1.5 block text-xs font-semibold text-fg-subdued"
							>
								Description
							</label>
							<Input
								id="item-desc-input"
								name="description"
								bind:value={description}
								placeholder="Description (optional)"
							/>
						</div>
					{/if}

					{#if isDeckView}
						<YdkDeckViewer
							{ydkData}
							onEdit={() => (editing = true)}
							onDelete={deleteItem}
							{assignedTags}
						/>
					{:else}
						<div class="rounded-xl border border-border bg-surface p-5 shadow-xs">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
									Content
								</h3>
							</div>
							{#if editing}
								<MarkdownEditor
									bind:value={content}
									onSave={saveItem}
									docLinks={data.links}
									rows={12}
									minHeight="280px"
									placeholder="Write content (markdown & [[wikilinks]] supported)..."
								/>
							{:else if content}
								<div class="markdown-content text-sm leading-relaxed text-fg">
									{@html renderedContent}
								</div>
							{:else}
								<EmptyState
									icon="fa-file-alt"
									message="No content yet"
									submessage="Click Edit to add content"
								/>
							{/if}
						</div>

						{#if editing}
							<div class="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xs">
								<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Media</h3>
								<div class="grid gap-3 sm:grid-cols-3">
									<Input
										type="url"
										name="imageUrl"
										label="Image URL"
										bind:value={imageUrl}
										placeholder="https://..."
									/>
									<Input
										type="url"
										name="videoUrl"
										label="Video URL"
										bind:value={videoUrl}
										placeholder="https://..."
									/>
									<Input
										type="url"
										name="externalUrl"
										label="External URL"
										bind:value={externalUrl}
										placeholder="https://..."
									/>
								</div>
								{#if data.enabledFeatures?.ydk !== false}
									<div class="flex flex-col gap-1.5">
										<span class="text-[10px] font-semibold tracking-wide text-fg-subdued"
											>YDK Deck</span
										>
										<div class="flex items-center gap-2">
											<Checkbox bind:checked={ydkEnabled} label="Enable YDK" />
											{#if isDeck && !ydkEnabled}
												<Button variant="danger" size="sm" onclick={clearYdk}>Clear</Button>
											{/if}
										</div>
										{#if ydkEnabled}
											<Textarea
												bind:value={ydkInput}
												rows={5}
												placeholder="#main&#10;12345678&#10;#extra&#10;87654321&#10;!side&#10;11111111"
											/>
											<div class="flex items-center gap-3">
												<Button variant="primary" size="sm" onclick={applyYdkPaste}
													><i class="fas fa-paste text-[10px]"></i> Apply</Button
												>
												<label
													class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border"
													><i class="fas fa-upload text-[10px]"></i> Import .ydk<input
														type="file"
														accept=".ydk,.txt"
														class="hidden"
														onchange={handleYdkFileImport}
													/></label
												>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					{/if}

					{#if content && isDeckView}
						<div class="rounded-xl border border-border bg-surface p-5 shadow-xs">
							<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
								Content
							</h3>
							<div class="markdown-content text-sm leading-relaxed text-fg">
								{@html renderedContent}
							</div>
						</div>
					{/if}

					{#if item.videoUrl && !editing}
						<div class="rounded-xl border border-border bg-surface p-4 shadow-xs">
							<div class="aspect-video">
								<iframe
									src={item.videoUrl}
									title="Video"
									class="h-full w-full rounded-lg"
									allowfullscreen
								></iframe>
							</div>
						</div>
					{/if}

					{#if externalHref && !editing}
						<div class="rounded-xl border border-border bg-surface p-3 shadow-xs">
							<Button
								href={externalHref}
								target="_blank"
								rel="noopener noreferrer"
								variant="ghost"
								size="sm"
								class="w-full justify-start gap-2 text-xs text-primary-text hover:text-primary-text-hover"
							>
								<i class="fas fa-external-link text-xs"></i>
								{item.externalUrl}
							</Button>
						</div>
					{/if}

					{#if !showTree || isDeckView}
						<ChildItemList
							parentType="item"
							parentId={item.id}
							{children}
							onAdd={handleChildAdd}
							onRemove={handleChildRemove}
							onReorder={handleChildReorder}
						/>
					{:else if children.length > 0}
						<div class="rounded-xl border border-border bg-surface p-5 shadow-xs">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
									Tree View
								</h3>
								<Button
									variant="secondary"
									size="sm"
									onclick={toggleTreeView}
									aria-label="Switch to list view"
									><i class="fas fa-list text-[9px]"></i> List</Button
								>
							</div>
							<div class="h-[350px] overflow-hidden rounded-lg border border-border sm:h-[400px]">
								<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
							</div>
						</div>
					{/if}

					<BacklinksPanel backlinks={data.backlinks} />
				</div>

				<aside
					class="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-xs {isDeckView
						? 'order-2'
						: 'order-1'} lg:sticky lg:top-6 lg:order-2 lg:w-72 lg:shrink-0 lg:self-start xl:w-80"
				>
					<div>
						{#if item.imageUrl}
							<ItemImage src={item.imageUrl} alt={item.name} size="full" />
						{:else}
							<div class="flex h-32 items-center justify-center rounded-sm bg-muted">
								<i class="fas fa-cube text-3xl text-fg-subdued"></i>
							</div>
						{/if}
					</div>

					<div>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
							Details
						</h3>
						<dl class="space-y-2 text-xs">
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Type</dt>
								<dd class="text-fg capitalize">{item.type}</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Created</dt>
								<dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Updated</dt>
								<dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd>
							</div>
						</dl>
					</div>

					<div>
						<button
							type="button"
							aria-label="Toggle favorite"
							onclick={toggleFavorite}
							class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors {favorite
								? 'bg-yellow-400/10 text-yellow-400'
								: 'bg-muted text-fg-subdued hover:bg-border hover:text-fg'}"
						>
							<i class="fas fa-star"></i>
							<span>{favorite ? 'Favorited' : 'Add to favorites'}</span>
						</button>
					</div>

					<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
				</aside>
			</div>
		</div>
	</div>
{/if}
