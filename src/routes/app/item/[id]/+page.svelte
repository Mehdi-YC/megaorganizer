<script lang="ts">
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { getTagIds, toggleArrayItem } from '$lib/utils';
	import { YdkDeckViewer, ChildItemList, TagPicker } from '$lib/components/item';
	import MindMap from '$lib/components/ui/MindMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ItemImage from '$lib/components/ui/ItemImage.svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let item = $state(data.item);
	// svelte-ignore state_referenced_locally
	let children = $state(data.children ?? []);
	let allTags = $state<any[]>([]);
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
	let tagIds = $state<string[]>(getTagIds(item));
	// svelte-ignore state_referenced_locally
	let ydkData = $state(item?.ydkData ?? '');
	let ydkInput = $state('');
	// svelte-ignore state_referenced_locally
	let ydkEnabled = $state(!!item?.ydkData);
	let showTree = $state(false);
	let subtree = $state<any[]>([]);
	// svelte-ignore state_referenced_locally
	let favorite = $state(item?.favorite ?? false);

	let isDeck = $derived(!!ydkData);
	let isDeckView = $derived(isDeck && !editing);
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
	let renderedContent = $state('');

	$effect(() => {
		renderMarkdown(content).then((html) => {
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
		const body: any = {
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
		if (res.ok) goto('/app/library');
	}

	function toggleTag(tagId: string) {
		tagIds = toggleArrayItem(tagIds, tagId);
	}

	function handleChildAdd(child: any) {
		children = [...children, child];
	}

	function handleChildRemove(childId: string) {
		children = children.filter((c: any) => c.id !== childId);
	}

	function handleChildReorder(fromIdx: number, toIdx: number) {
		const next = [...children];
		const [moved] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, moved);
		children = next;
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

	function handleMindmapNodeClick(node: any) {
		if (node.type === 'item') goto(`/app/item/${node.id}`);
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

{#if !item}
	<div class="flex h-full items-center justify-center">
		<EmptyState icon="fa-exclamation-triangle" message="Item not found">
			<Button href="/app/library" variant="primary" size="sm">Back to Library</Button>
		</EmptyState>
	</div>
{:else}
	{@const isDeckView = isDeck && !editing}
	<div class="space-y-4 p-4 sm:p-6 lg:flex lg:h-[calc(100vh-49px)] lg:flex-col lg:space-y-0 lg:p-0">
		<div class="border-b border-border bg-bg-subdued px-4 py-2 sm:px-6 lg:shrink-0">
			<div class="flex items-center gap-1.5 text-[11px] text-fg-subdued">
				<button
					type="button"
					aria-label="Go back"
					class="cursor-pointer hover:text-primary"
					onclick={() => history.back()}><i class="fas fa-arrow-left text-[10px]"></i></button
				>
				<i class="fas fa-chevron-right text-[8px]"></i>
				<span class="truncate text-fg">{item.name}</span>
			</div>
		</div>

		<div class="lg:shrink-0 lg:px-8 lg:pt-8">
			<div class="flex items-center gap-3">
				<div class="min-w-0 flex-1">
					{#if editing}
						<input
							type="text"
							bind:value={name}
							class="w-full border-b-2 border-primary bg-transparent text-lg font-semibold text-fg-accent focus:outline-none lg:text-xl"
						/>
						<input
							type="text"
							bind:value={description}
							placeholder="Description (optional)"
							class="mt-1 w-full border-b border-border bg-transparent text-base text-fg-subdued placeholder:text-fg-subdued/50 focus:outline-none sm:text-sm"
						/>
					{:else}
						<h1 class="text-lg font-semibold text-fg-accent lg:text-xl">{item.name}</h1>
						{#if item.description}<p class="mt-0.5 text-sm text-fg-subdued">
								{item.description}
							</p>{/if}
						<p class="mt-1 text-[10px] text-fg-subdued capitalize lg:hidden">{item.type}</p>
					{/if}
				</div>
				<div class="flex shrink-0 gap-1.5">
					{#if editing}
						<Button variant="primary" size="md" onclick={saveItem}
							><i class="fas fa-check text-xs"></i> Save</Button
						>
						<Button variant="secondary" size="md" onclick={resetForm}>Cancel</Button>
					{:else}
						{#if !isDeckView}
							<button
								type="button"
								aria-label="Toggle tree view"
								class="inline-flex h-[36px] cursor-pointer items-center gap-1.5 rounded-sm {showTree
									? 'bg-primary text-white'
									: 'bg-muted text-fg'} px-3 text-sm font-medium transition-colors hover:bg-border"
								onclick={toggleTreeView}
							>
								<i class="fas fa-project-diagram text-xs"></i>
							</button>
						{/if}
						<Button variant="secondary" size="md" aria-label="Edit" onclick={() => (editing = true)}
							><i class="fas fa-pen text-xs"></i></Button
						>
						<Button variant="danger" size="md" aria-label="Delete" onclick={deleteItem}
							><i class="fas fa-trash text-xs"></i></Button
						>
					{/if}
				</div>
			</div>
		</div>

		<div class="space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:gap-0 lg:space-y-0">
			<div
				class="space-y-4 {isDeckView
					? 'order-1'
					: 'order-2'} lg:order-1 lg:min-w-0 lg:flex-1 lg:space-y-6 lg:overflow-y-auto lg:px-8 lg:pb-8"
			>
				{#if isDeckView}
					<YdkDeckViewer
						{ydkData}
						onEdit={() => (editing = true)}
						onDelete={deleteItem}
						{assignedTags}
					/>
				{:else}
					<div
						class="rounded-sm border border-border bg-surface p-4 lg:border-0 lg:bg-transparent lg:p-0"
					>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase lg:hidden">
							Content
						</h3>
						{#if editing}
							<Textarea
								bind:value={content}
								rows={12}
								placeholder="Write content (markdown supported)..."
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
						<div class="space-y-3 rounded-sm border border-border bg-surface p-4">
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
							<div class="flex flex-col gap-1.5">
								<span class="text-[10px] font-semibold tracking-wide text-fg-subdued">YDK Deck</span
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
						</div>
					{/if}
				{/if}

				{#if content && isDeckView}
					<div class="rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
							Content
						</h3>
						<div class="markdown-content text-sm leading-relaxed text-fg">
							{@html renderedContent}
						</div>
					</div>
				{/if}

				{#if item.videoUrl && !editing}
					<div class="rounded-sm border border-border bg-surface p-4">
						<div class="aspect-video">
							<iframe
								src={item.videoUrl}
								title="Video"
								class="h-full w-full rounded-sm"
								allowfullscreen
							></iframe>
						</div>
					</div>
				{/if}

				{#if item.externalUrl && !editing}
					<div class="rounded-sm border border-border bg-surface p-3">
						<a
							href={item.externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"
							><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a
						>
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
					<div class="rounded-sm border border-border bg-surface p-4 lg:p-5">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
								Tree View
							</h3>
							<Button
								variant="secondary"
								size="sm"
								onclick={toggleTreeView}
								aria-label="Switch to list view"><i class="fas fa-list text-[9px]"></i> List</Button
							>
						</div>
						<div class="h-[350px] overflow-hidden rounded-sm border border-border sm:h-[400px]">
							<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
						</div>
					</div>
				{/if}
			</div>

			<aside
				class="space-y-5 rounded-sm border border-border bg-surface p-4 {isDeckView
					? 'order-2'
					: 'order-1'} lg:order-2 lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:p-5 xl:w-80"
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
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">Details</h3>
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
							? 'bg-yellow-400/10 text-yellow-500'
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
{/if}
