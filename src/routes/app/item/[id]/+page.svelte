<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import {
		isSmallImage as checkIsSmallImage,
		getTagIds,
		toggleArrayItem,
		DEFAULT_TAG_COLOR
	} from '$lib/utils';
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
	let isSmall = $state(false);
	let showTree = $state(false);
	let subtree = $state<any[]>([]);
	// svelte-ignore state_referenced_locally
	let favorite = $state(item?.favorite ?? false);

	let isDeck = $derived(!!ydkData);
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
	let renderedContent = $state('');

	$effect(() => {
		renderMarkdown(content).then((html) => {
			renderedContent = html;
		});
	});

	onMount(async () => {
		if (item?.imageUrl) isSmall = await checkIsSmallImage(item.imageUrl);
		const t = await fetch('/api/tags').then((r) => r.json());
		allTags = t;
	});

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
		if (!confirm('Delete this item?')) return;
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
		else favorite = !newVal; // revert on error
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
	<!-- Header -->
	<div class="border-b border-border bg-bg-subdued px-4 py-2 sm:px-6">
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

	{#if isDeck && !editing}
		<!-- DECK VIEW -->
		<!-- Mobile: single column -->
		<div class="space-y-4 p-4 sm:p-6 lg:hidden">
			<div class="flex items-center gap-3">
				<div class="min-w-0 flex-1">
					<h1 class="text-lg font-semibold text-fg-accent">{item.name}</h1>
					{#if item.description}<p class="mt-0.5 text-sm text-fg-subdued">
							{item.description}
						</p>{/if}
					<p class="mt-1 text-[10px] text-fg-subdued capitalize">{item.type}</p>
				</div>
				<div class="flex shrink-0 gap-1.5">
					<Button variant="secondary" size="md" aria-label="Edit" onclick={() => (editing = true)}
						><i class="fas fa-pen text-xs"></i></Button
					>
					<Button variant="danger" size="md" aria-label="Delete" onclick={deleteItem}
						><i class="fas fa-trash text-xs"></i></Button
					>
				</div>
			</div>

			<YdkDeckViewer
				{ydkData}
				onEdit={() => (editing = true)}
				onDelete={deleteItem}
				{assignedTags}
			/>

			{#if content}
				<div class="rounded-sm border border-border bg-surface p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">Content</h3>
					<div class="markdown-content text-sm leading-relaxed text-fg">
						{@html renderedContent}
					</div>
				</div>
			{/if}

			{#if item.videoUrl}
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

			{#if item.externalUrl}
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

			<ChildItemList
				parentType="item"
				parentId={item.id}
				{children}
				onAdd={handleChildAdd}
				onRemove={handleChildRemove}
				onReorder={handleChildReorder}
			/>
		</div>

		<!-- Desktop: content left + sidebar right -->
		<div class="hidden min-h-[calc(100vh-49px)] gap-0 lg:flex">
			<div class="flex-1 overflow-y-auto p-8">
				<div class="mb-6 flex items-center gap-3">
					<h1 class="flex-1 text-xl font-semibold text-fg-accent">{item.name}</h1>
					{#if item.description}<p class="mt-1 text-sm text-fg-subdued">{item.description}</p>{/if}
					<div class="flex shrink-0 gap-1.5">
						<Button variant="secondary" size="md" aria-label="Edit" onclick={() => (editing = true)}
							><i class="fas fa-pen text-xs"></i></Button
						>
						<Button variant="danger" size="md" aria-label="Delete" onclick={deleteItem}
							><i class="fas fa-trash text-xs"></i></Button
						>
					</div>
				</div>

				<YdkDeckViewer
					{ydkData}
					onEdit={() => (editing = true)}
					onDelete={deleteItem}
					{assignedTags}
				/>

				{#if content}
					<div class="mt-6 rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
							Content
						</h3>
						<div class="markdown-content text-sm leading-relaxed text-fg">
							{@html renderedContent}
						</div>
					</div>
				{/if}

				{#if item.videoUrl}
					<div class="mt-6 rounded-sm border border-border bg-surface p-4">
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

				{#if item.externalUrl}
					<div class="mt-6 rounded-sm border border-border bg-surface p-3">
						<a
							href={item.externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"
							><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a
						>
					</div>
				{/if}

				<ChildItemList
					parentType="item"
					parentId={item.id}
					{children}
					onAdd={handleChildAdd}
					onRemove={handleChildRemove}
					onReorder={handleChildReorder}
				/>
			</div>

			<!-- Right sidebar -->
			<div
				class="w-72 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-surface p-5 xl:w-80"
			>
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
			</div>
		</div>
	{:else}
		<!-- NON-DECK VIEW -->
		<!-- Mobile: single column -->
		<div class="space-y-4 p-4 sm:p-6 lg:hidden">
			<!-- Title + actions -->
			<div class="flex items-center gap-3">
				<div class="min-w-0 flex-1">
					{#if editing}
						<input
							type="text"
							bind:value={name}
							class="w-full border-b-2 border-primary bg-transparent text-lg font-semibold text-fg-accent focus:outline-none"
						/>
						<input
							type="text"
							bind:value={description}
							placeholder="Description (optional)"
							class="mt-1 w-full border-b border-border bg-transparent text-sm text-fg-subdued placeholder:text-fg-subdued/50 focus:outline-none"
						/>
					{:else}
						<h1 class="text-lg font-semibold text-fg-accent">{item.name}</h1>
						{#if item.description}<p class="mt-0.5 text-sm text-fg-subdued">
								{item.description}
							</p>{/if}
						<p class="mt-1 text-[10px] text-fg-subdued capitalize">{item.type}</p>
					{/if}
				</div>
				<div class="flex shrink-0 gap-1.5">
					{#if editing}
						<Button variant="primary" size="md" onclick={saveItem}
							><i class="fas fa-check text-xs"></i> Save</Button
						>
						<Button
							variant="secondary"
							size="md"
							onclick={() => {
								editing = false;
								if (item) {
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
							}}>Cancel</Button
						>
					{:else}
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
						<Button variant="secondary" size="md" aria-label="Edit" onclick={() => (editing = true)}
							><i class="fas fa-pen text-xs"></i></Button
						>
						<Button variant="danger" size="md" aria-label="Delete" onclick={deleteItem}
							><i class="fas fa-trash text-xs"></i></Button
						>
					{/if}
				</div>
			</div>

			<!-- Mobile sidebar: image + details + tags -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<div class="flex items-start gap-3">
					{#if item.imageUrl}
						<ItemImage src={item.imageUrl} alt={item.name} size="md" />
					{:else}
						<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-muted">
							<i class="fas fa-cube text-lg text-fg-subdued"></i>
						</div>
					{/if}
					<dl class="min-w-0 flex-1 space-y-1 text-xs">
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
			</div>

			<!-- Mobile Tags -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
			</div>

			<!-- Content -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">Content</h3>
				{#if editing}
					<Textarea
						bind:value={content}
						rows={10}
						placeholder="Write content (markdown supported)..."
					/>
				{:else if content}
					<div class="markdown-content text-sm leading-relaxed text-fg">
						{@html renderedContent}
					</div>
				{:else}
					<EmptyState icon="fa-file-alt" message="No content yet" />
				{/if}
			</div>

			<!-- Edit-only fields -->
			{#if editing}
				<div class="space-y-3 rounded-sm border border-border bg-surface p-4">
					<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Media</h3>
					<Input
						type="url"
						name="imageUrl-m"
						label="Image URL"
						bind:value={imageUrl}
						placeholder="https://..."
					/>
					<Input
						type="url"
						name="videoUrl-m"
						label="Video URL"
						bind:value={videoUrl}
						placeholder="https://..."
					/>
					<Input
						type="url"
						name="externalUrl-m"
						label="External URL"
						bind:value={externalUrl}
						placeholder="https://..."
					/>
					<div class="flex flex-col gap-1.5">
						<span class="text-[10px] font-semibold tracking-wide text-fg-subdued" id="ydk-label-m"
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
				</div>
			{/if}

			<!-- Video -->
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

			<!-- External link -->
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

			<!-- Child Items / Tree View -->
			{#if !showTree}
				<ChildItemList
					parentType="item"
					parentId={item.id}
					{children}
					onAdd={handleChildAdd}
					onRemove={handleChildRemove}
					onReorder={handleChildReorder}
				/>
			{:else if children.length > 0}
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Tree View</h3>
						<Button
							variant="secondary"
							size="sm"
							onclick={toggleTreeView}
							aria-label="Switch to list view"><i class="fas fa-list text-[9px]"></i> List</Button
						>
					</div>
					<div class="overflow-hidden rounded-sm border border-border" style="height: 350px;">
						<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
					</div>
				</div>
			{/if}
		</div>

		<!-- Desktop: content left + sidebar right -->
		<div class="hidden min-h-[calc(100vh-49px)] gap-0 lg:flex">
			<!-- Main content area -->
			<div class="flex-1 overflow-y-auto p-8">
				<!-- Title + actions -->
				<div class="mb-6 flex items-center gap-3">
					{#if editing}
						<input
							type="text"
							bind:value={name}
							class="flex-1 border-b-2 border-primary bg-transparent text-xl font-semibold text-fg-accent focus:outline-none"
						/>
						<input
							type="text"
							bind:value={description}
							placeholder="Description (optional)"
							class="mt-1 flex-1 border-b border-border bg-transparent text-sm text-fg-subdued placeholder:text-fg-subdued/50 focus:outline-none"
						/>
					{:else}
						<h1 class="flex-1 text-xl font-semibold text-fg-accent">{item.name}</h1>
						{#if item.description}<p class="mt-1 text-sm text-fg-subdued">
								{item.description}
							</p>{/if}
					{/if}
					<div class="flex shrink-0 gap-1.5">
						{#if editing}
							<Button variant="primary" size="md" onclick={saveItem}
								><i class="fas fa-check text-xs"></i> Save</Button
							>
							<Button
								variant="secondary"
								size="md"
								onclick={() => {
									editing = false;
									if (item) {
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
								}}>Cancel</Button
							>
						{:else}
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
							<Button
								variant="secondary"
								size="md"
								aria-label="Edit"
								onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></Button
							>
							<Button variant="danger" size="md" aria-label="Delete" onclick={deleteItem}
								><i class="fas fa-trash text-xs"></i></Button
							>
						{/if}
					</div>
				</div>

				<!-- Content -->
				<div class="mb-6">
					{#if editing}
						<Textarea
							bind:value={content}
							rows={20}
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

				<!-- Video -->
				{#if item.videoUrl && !editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-4">
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

				<!-- External link -->
				{#if item.externalUrl && !editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-3">
						<a
							href={item.externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"
							><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a
						>
					</div>
				{/if}

				<!-- Edit-only fields (desktop) -->
				{#if editing}
					<div class="mb-6 space-y-3 rounded-sm border border-border bg-surface p-4">
						<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Media</h3>
						<div class="grid gap-3 sm:grid-cols-3">
							<Input
								type="url"
								name="imageUrl-d"
								label="Image URL"
								bind:value={imageUrl}
								placeholder="https://..."
							/>
							<Input
								type="url"
								name="videoUrl-d"
								label="Video URL"
								bind:value={videoUrl}
								placeholder="https://..."
							/>
							<Input
								type="url"
								name="externalUrl-d"
								label="External URL"
								bind:value={externalUrl}
								placeholder="https://..."
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<span class="text-[10px] font-semibold tracking-wide text-fg-subdued" id="ydk-label-d"
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
					</div>
				{/if}

				<!-- Child Items / Tree View -->
				{#if !showTree}
					<ChildItemList
						parentType="item"
						parentId={item.id}
						{children}
						onAdd={handleChildAdd}
						onRemove={handleChildRemove}
						onReorder={handleChildReorder}
					/>
				{:else if children.length > 0}
					<div class="rounded-sm border border-border bg-surface p-5">
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
						<div class="overflow-hidden rounded-sm border border-border" style="height: 400px;">
							<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
						</div>
					</div>
				{/if}
			</div>

			<!-- Right sidebar -->
			<div
				class="w-72 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-surface p-5 xl:w-80"
			>
				<!-- Image -->
				<div>
					{#if item.imageUrl}
						<ItemImage src={item.imageUrl} alt={item.name} size="full" />
					{:else}
						<div class="flex h-32 items-center justify-center rounded-sm bg-muted">
							<i class="fas fa-cube text-3xl text-fg-subdued"></i>
						</div>
					{/if}
				</div>

				<!-- Details -->
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

				<!-- Tags -->
				<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
			</div>
		</div>
	{/if}
{/if}
