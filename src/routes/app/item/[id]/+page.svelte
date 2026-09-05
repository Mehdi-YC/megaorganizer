<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { isSmallImage as checkIsSmallImage, getTagIds, toggleArrayItem, DEFAULT_TAG_COLOR } from '$lib/utils';
	import { YdkDeckViewer, ChildItemList, TagPicker } from '$lib/components/item';
	import MindMap from '$lib/components/ui/MindMap.svelte';

	let { data } = $props();
	let item = $state(data.item);
	let children = $state(data.children ?? []);
	let allTags = $state<any[]>([]);
	let editing = $state(false);
	let name = $state(item?.name ?? '');
	let description = $state(item?.description ?? '');
	let content = $state(item?.markdown ?? '');
	let imageUrl = $state(item?.imageUrl ?? '');
	let videoUrl = $state(item?.videoUrl ?? '');
	let externalUrl = $state(item?.externalUrl ?? '');
	let tagIds = $state<string[]>(getTagIds(item));
	let ydkData = $state(item?.ydkData ?? '');
	let ydkInput = $state('');
	let ydkEnabled = $state(!!item?.ydkData);
	let isSmall = $state(false);
	let showTree = $state(false);
	let subtree = $state<any[]>([]);

	let isDeck = $derived(!!ydkData);
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
	let renderedContent = $state('');

	$effect(() => {
		renderMarkdown(content).then((html) => { renderedContent = html; });
	});

	onMount(async () => {
		if (item?.imageUrl) isSmall = await checkIsSmallImage(item.imageUrl);
		const t = await fetch('/api/tags').then(r => r.json());
		allTags = t;
	});

	async function saveItem() {
		if (!item) return;
		const body: any = { id: item.id, name, description, markdown: content, imageUrl, videoUrl, externalUrl, tags: JSON.stringify(tagIds) };
		if (ydkEnabled && ydkData) body.ydkData = ydkData;
		else if (!ydkEnabled) body.ydkData = '';
		const res = await fetch('/api/tree', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		if (res.ok) { editing = false; item = { ...item, ...body }; }
	}

	async function deleteItem() {
		if (!confirm('Delete this item?')) return;
		const res = await fetch('/api/tree', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item?.id }) });
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
				.then((data) => { subtree = Array.isArray(data) ? data : []; })
				.catch(() => { subtree = []; });
		}
	}

	function handleMindmapNodeClick(node: any) {
		if (node.type === 'item') goto(`/app/item/${node.id}`);
	}

	function parseYdk(text: string) {
		const lines = text.split('\n').map((l) => l.trim());
		let mainDeck: string[] = [], extraDeck: string[] = [], sideDeck: string[] = [], section = '';
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
		reader.onload = () => { ydkInput = reader.result as string; applyYdkPaste(); };
		reader.readAsText(file);
		input.value = '';
	}

	function clearYdk() { ydkData = ''; ydkEnabled = false; ydkInput = ''; }
</script>

<svelte:head><title>{item?.name || 'Item'} - MegaOrganize</title></svelte:head>

{#if !item}
	<div class="flex h-full items-center justify-center">
		<div class="rounded-sm border border-border bg-surface py-16 text-center px-8">
			<i class="fas fa-exclamation-triangle mb-3 text-3xl text-fg-subdued"></i>
			<p class="text-sm text-fg-subdued">Item not found</p>
			<a href="/app/library" class="mt-3 inline-block text-sm text-primary hover:text-primary-hover">Back to Library</a>
		</div>
	</div>
{:else}
	<!-- Header -->
	<div class="border-b border-border bg-bg-subdued px-4 sm:px-6 py-2">
		<div class="flex items-center gap-1.5 text-[11px] text-fg-subdued">
			<button type="button" aria-label="Go back" class="hover:text-primary" onclick={() => history.back()}><i class="fas fa-arrow-left text-[10px]"></i></button>
			<i class="fas fa-chevron-right text-[8px]"></i>
			<span class="text-fg truncate">{item.name}</span>
		</div>
	</div>

	{#if isDeck && !editing}
		<!-- DECK VIEW -->
		<!-- Mobile: single column -->
		<div class="lg:hidden p-4 sm:p-6 space-y-4">
			<div class="flex items-center gap-3">
				<div class="flex-1 min-w-0">
					<h1 class="text-lg font-semibold text-fg-accent">{item.name}</h1>
					{#if item.description}<p class="text-sm text-fg-subdued mt-0.5">{item.description}</p>{/if}
					<p class="text-[10px] text-fg-subdued capitalize mt-1">{item.type}</p>
				</div>
				<div class="flex gap-1.5 shrink-0">
					<button type="button" aria-label="Edit" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
					<button type="button" aria-label="Delete" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
				</div>
			</div>

			<YdkDeckViewer {ydkData} onEdit={() => (editing = true)} onDelete={deleteItem} {assignedTags} />

			{#if content}
				<div class="rounded-sm border border-border bg-surface p-4">
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Content</h3>
					<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
				</div>
			{/if}

			{#if item.videoUrl}
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="aspect-video"><iframe src={item.videoUrl} title="Video" class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
				</div>
			{/if}

			{#if item.externalUrl}
				<div class="rounded-sm border border-border bg-surface p-3">
					<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a>
				</div>
			{/if}

			<ChildItemList parentType="item" parentId={item.id} {children} onAdd={handleChildAdd} onRemove={handleChildRemove} onReorder={handleChildReorder} />
		</div>

		<!-- Desktop: content left + sidebar right -->
		<div class="hidden lg:flex gap-0 min-h-[calc(100vh-49px)]">
			<div class="flex-1 p-8 overflow-y-auto">
				<div class="flex items-center gap-3 mb-6">
					<h1 class="flex-1 text-xl font-semibold text-fg-accent">{item.name}</h1>
					{#if item.description}<p class="mt-1 text-sm text-fg-subdued">{item.description}</p>{/if}
					<div class="flex gap-1.5 shrink-0">
						<button type="button" aria-label="Edit" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
						<button type="button" aria-label="Delete" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
					</div>
				</div>

				<YdkDeckViewer {ydkData} onEdit={() => (editing = true)} onDelete={deleteItem} {assignedTags} />

				{#if content}
					<div class="mt-6 rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Content</h3>
						<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
					</div>
				{/if}

				{#if item.videoUrl}
					<div class="mt-6 rounded-sm border border-border bg-surface p-4">
						<div class="aspect-video"><iframe src={item.videoUrl} title="Video" class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
					</div>
				{/if}

				{#if item.externalUrl}
					<div class="mt-6 rounded-sm border border-border bg-surface p-3">
						<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a>
					</div>
				{/if}

				<ChildItemList parentType="item" parentId={item.id} {children} onAdd={handleChildAdd} onRemove={handleChildRemove} onReorder={handleChildReorder} />
			</div>

			<!-- Right sidebar -->
			<div class="w-72 xl:w-80 shrink-0 border-l border-border bg-surface p-5 space-y-5 overflow-y-auto">
				<div>
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Details</h3>
					<dl class="space-y-2 text-xs">
						<div class="flex justify-between"><dt class="text-fg-subdued">Type</dt><dd class="capitalize text-fg">{item.type}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Created</dt><dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Updated</dt><dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd></div>
					</dl>
				</div>
				<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
			</div>
		</div>
	{:else}
		<!-- NON-DECK VIEW -->
		<!-- Mobile: single column -->
		<div class="lg:hidden p-4 sm:p-6 space-y-4">
			<!-- Title + actions -->
			<div class="flex items-center gap-3">
				<div class="flex-1 min-w-0">
					{#if editing}
						<input type="text" bind:value={name} class="w-full border-b-2 border-primary bg-transparent text-lg font-semibold text-fg-accent focus:outline-none" />
						<input type="text" bind:value={description} placeholder="Description (optional)" class="mt-1 w-full border-b border-border bg-transparent text-sm text-fg-subdued placeholder:text-fg-subdued/50 focus:outline-none" />
					{:else}
						<h1 class="text-lg font-semibold text-fg-accent">{item.name}</h1>
						{#if item.description}<p class="text-sm text-fg-subdued mt-0.5">{item.description}</p>{/if}
						<p class="text-[10px] text-fg-subdued capitalize mt-1">{item.type}</p>
					{/if}
				</div>
				<div class="flex gap-1.5 shrink-0">
					{#if editing}
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={saveItem}><i class="fas fa-check text-xs"></i> Save</button>
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => { editing = false; if (item) { name = item.name; description = item.description ?? ''; content = item.markdown ?? ''; imageUrl = item.imageUrl ?? ''; videoUrl = item.videoUrl ?? ''; externalUrl = item.externalUrl ?? ''; tagIds = getTagIds(item); ydkData = item.ydkData ?? ''; ydkEnabled = !!item.ydkData; } }}>Cancel</button>
					{:else}
						<button type="button" aria-label="Toggle tree view" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm {showTree ? 'bg-primary text-white' : 'bg-muted text-fg'} px-3 text-sm font-medium hover:bg-border transition-colors" onclick={toggleTreeView}>
							<i class="fas fa-project-diagram text-xs"></i>
						</button>
						<button type="button" aria-label="Edit" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
						<button type="button" aria-label="Delete" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
					{/if}
				</div>
			</div>

			<!-- Mobile sidebar: image + details + tags -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<div class="flex items-start gap-3">
					{#if item.imageUrl}
						{#if isSmall}
							<div class="relative h-14 w-14 shrink-0 overflow-hidden rounded">
								<img src={item.imageUrl} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
								<img src={item.imageUrl} alt={item.name} class="relative h-full w-full object-contain" />
							</div>
						{:else}
							<img src={item.imageUrl} alt={item.name} class="h-14 w-14 rounded object-cover shrink-0" />
						{/if}
					{:else}
						<div class="flex h-14 w-14 items-center justify-center rounded-sm bg-muted shrink-0">
							<i class="fas fa-cube text-lg text-fg-subdued"></i>
						</div>
					{/if}
					<dl class="flex-1 min-w-0 space-y-1 text-xs">
						<div class="flex justify-between"><dt class="text-fg-subdued">Type</dt><dd class="capitalize text-fg">{item.type}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Created</dt><dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Updated</dt><dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd></div>
					</dl>
				</div>
			</div>

			<!-- Mobile Tags -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
			</div>

			<!-- Content -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Content</h3>
				{#if editing}
					<textarea bind:value={content} rows="10" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Write content (markdown supported)..."></textarea>
				{:else if content}
					<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
				{:else}
					<p class="text-xs text-fg-subdued text-center py-4">No content yet</p>
				{/if}
			</div>

			<!-- Edit-only fields -->
			{#if editing}
				<div class="rounded-sm border border-border bg-surface p-4 space-y-3">
					<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Media</h3>
					<div class="flex flex-col gap-1.5">
						<label for="imageUrl-m" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Image URL</label>
						<input type="url" id="imageUrl-m" bind:value={imageUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="videoUrl-m" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Video URL</label>
						<input type="url" id="videoUrl-m" bind:value={videoUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="externalUrl-m" class="text-[10px] font-semibold text-fg-subdued tracking-wide">External URL</label>
						<input type="url" id="externalUrl-m" bind:value={externalUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<span class="text-[10px] font-semibold text-fg-subdued tracking-wide" id="ydk-label-m">YDK Deck</span>
						<label for="ydk-toggle-m" class="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" id="ydk-toggle-m" bind:checked={ydkEnabled} class="h-4 w-4 rounded-sm border-border bg-bg text-primary focus:ring-primary" />
							<span class="text-sm text-fg">Enable YDK</span>
							{#if isDeck && !ydkEnabled}
								<button type="button" class="text-xs text-error hover:text-error/80" onclick={clearYdk}>Clear</button>
							{/if}
						</label>
						{#if ydkEnabled}
							<textarea bind:value={ydkInput} rows="5" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 font-mono text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="#main&#10;12345678&#10;#extra&#10;87654321&#10;!side&#10;11111111"></textarea>
							<div class="flex items-center gap-3">
								<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover" onclick={applyYdkPaste}><i class="fas fa-paste text-[10px]"></i> Apply</button>
								<label class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border cursor-pointer"><i class="fas fa-upload text-[10px]"></i> Import .ydk<input type="file" accept=".ydk,.txt" class="hidden" onchange={handleYdkFileImport} /></label>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Video -->
			{#if item.videoUrl && !editing}
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="aspect-video"><iframe src={item.videoUrl} title="Video" class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
				</div>
			{/if}

			<!-- External link -->
			{#if item.externalUrl && !editing}
				<div class="rounded-sm border border-border bg-surface p-3">
					<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a>
				</div>
			{/if}

			<!-- Child Items / Tree View -->
			{#if !showTree}
				<ChildItemList parentType="item" parentId={item.id} {children} onAdd={handleChildAdd} onRemove={handleChildRemove} onReorder={handleChildReorder} />
			{:else if children.length > 0}
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Tree View</h3>
						<button type="button" aria-label="Switch to list view" class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-muted px-2.5 text-[11px] font-medium text-fg hover:bg-border" onclick={toggleTreeView}><i class="fas fa-list text-[9px]"></i> List</button>
					</div>
					<div class="rounded-sm border border-border overflow-hidden" style="height: 350px;">
						<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
					</div>
				</div>
			{/if}
		</div>

		<!-- Desktop: content left + sidebar right -->
		<div class="hidden lg:flex gap-0 min-h-[calc(100vh-49px)]">
			<!-- Main content area -->
			<div class="flex-1 p-8 overflow-y-auto">
				<!-- Title + actions -->
				<div class="flex items-center gap-3 mb-6">
					{#if editing}
						<input type="text" bind:value={name} class="flex-1 border-b-2 border-primary bg-transparent text-xl font-semibold text-fg-accent focus:outline-none" />
						<input type="text" bind:value={description} placeholder="Description (optional)" class="mt-1 flex-1 border-b border-border bg-transparent text-sm text-fg-subdued placeholder:text-fg-subdued/50 focus:outline-none" />
					{:else}
						<h1 class="flex-1 text-xl font-semibold text-fg-accent">{item.name}</h1>
						{#if item.description}<p class="mt-1 text-sm text-fg-subdued">{item.description}</p>{/if}
					{/if}
					<div class="flex gap-1.5 shrink-0">
						{#if editing}
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={saveItem}><i class="fas fa-check text-xs"></i> Save</button>
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => { editing = false; if (item) { name = item.name; description = item.description ?? ''; content = item.markdown ?? ''; imageUrl = item.imageUrl ?? ''; videoUrl = item.videoUrl ?? ''; externalUrl = item.externalUrl ?? ''; tagIds = getTagIds(item); ydkData = item.ydkData ?? ''; ydkEnabled = !!item.ydkData; } }}>Cancel</button>
						{:else}
							<button type="button" aria-label="Toggle tree view" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm {showTree ? 'bg-primary text-white' : 'bg-muted text-fg'} px-3 text-sm font-medium hover:bg-border transition-colors" onclick={toggleTreeView}>
								<i class="fas fa-project-diagram text-xs"></i>
							</button>
							<button type="button" aria-label="Edit" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
							<button type="button" aria-label="Delete" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
						{/if}
					</div>
				</div>

				<!-- Content -->
				<div class="mb-6">
					{#if editing}
						<textarea bind:value={content} rows="20" class="w-full rounded-sm border border-border bg-surface px-4 py-3 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Write content (markdown supported)..."></textarea>
					{:else if content}
						<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
					{:else}
						<div class="rounded-sm border border-dashed border-border bg-surface py-16 text-center">
							<i class="fas fa-file-alt mb-2 text-2xl text-fg-subdued/40"></i>
							<p class="text-sm text-fg-subdued">No content yet</p>
							<p class="mt-1 text-xs text-fg-subdued">Click Edit to add content</p>
						</div>
					{/if}
				</div>

				<!-- Video -->
				{#if item.videoUrl && !editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-4">
						<div class="aspect-video"><iframe src={item.videoUrl} title="Video" class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
					</div>
				{/if}

				<!-- External link -->
				{#if item.externalUrl && !editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-3">
						<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a>
					</div>
				{/if}

				<!-- Edit-only fields (desktop) -->
				{#if editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-4 space-y-3">
						<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Media</h3>
						<div class="grid gap-3 sm:grid-cols-3">
							<div class="flex flex-col gap-1.5">
								<label for="imageUrl-d" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Image URL</label>
								<input type="url" id="imageUrl-d" bind:value={imageUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
							</div>
							<div class="flex flex-col gap-1.5">
								<label for="videoUrl-d" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Video URL</label>
								<input type="url" id="videoUrl-d" bind:value={videoUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
							</div>
							<div class="flex flex-col gap-1.5">
								<label for="externalUrl-d" class="text-[10px] font-semibold text-fg-subdued tracking-wide">External URL</label>
								<input type="url" id="externalUrl-d" bind:value={externalUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
							</div>
						</div>
						<div class="flex flex-col gap-1.5">
							<span class="text-[10px] font-semibold text-fg-subdued tracking-wide" id="ydk-label-d">YDK Deck</span>
							<label for="ydk-toggle-d" class="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" id="ydk-toggle-d" bind:checked={ydkEnabled} class="h-4 w-4 rounded-sm border-border bg-bg text-primary focus:ring-primary" />
								<span class="text-sm text-fg">Enable YDK</span>
								{#if isDeck && !ydkEnabled}
									<button type="button" class="text-xs text-error hover:text-error/80" onclick={clearYdk}>Clear</button>
								{/if}
							</label>
							{#if ydkEnabled}
								<textarea bind:value={ydkInput} rows="5" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 font-mono text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="#main&#10;12345678&#10;#extra&#10;87654321&#10;!side&#10;11111111"></textarea>
								<div class="flex items-center gap-3">
									<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover" onclick={applyYdkPaste}><i class="fas fa-paste text-[10px]"></i> Apply</button>
									<label class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border cursor-pointer"><i class="fas fa-upload text-[10px]"></i> Import .ydk<input type="file" accept=".ydk,.txt" class="hidden" onchange={handleYdkFileImport} /></label>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Child Items / Tree View -->
				{#if !showTree}
					<ChildItemList parentType="item" parentId={item.id} {children} onAdd={handleChildAdd} onRemove={handleChildRemove} onReorder={handleChildReorder} />
				{:else if children.length > 0}
					<div class="rounded-sm border border-border bg-surface p-5">
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Tree View</h3>
							<button type="button" aria-label="Switch to list view" class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-muted px-2.5 text-[11px] font-medium text-fg hover:bg-border" onclick={toggleTreeView}><i class="fas fa-list text-[9px]"></i> List</button>
						</div>
						<div class="rounded-sm border border-border overflow-hidden" style="height: 400px;">
							<MindMap tree={subtree} onNodeClick={handleMindmapNodeClick} />
						</div>
					</div>
				{/if}
			</div>

			<!-- Right sidebar -->
			<div class="w-72 xl:w-80 shrink-0 border-l border-border bg-surface p-5 space-y-5 overflow-y-auto">
				<!-- Image -->
				<div>
					{#if item.imageUrl}
						{#if isSmall}
							<div class="relative overflow-hidden rounded-sm">
								<img src={item.imageUrl} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
								<img src={item.imageUrl} alt={item.name} class="relative w-full rounded-sm object-contain" />
							</div>
						{:else}
							<img src={item.imageUrl} alt={item.name} class="w-full rounded-sm object-cover" />
						{/if}
					{:else}
						<div class="flex h-32 items-center justify-center rounded-sm bg-muted">
							<i class="fas fa-cube text-3xl text-fg-subdued"></i>
						</div>
					{/if}
				</div>

				<!-- Details -->
				<div>
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Details</h3>
					<dl class="space-y-2 text-xs">
						<div class="flex justify-between"><dt class="text-fg-subdued">Type</dt><dd class="capitalize text-fg">{item.type}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Created</dt><dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Updated</dt><dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd></div>
					</dl>
				</div>

				<!-- Tags -->
				<TagPicker {tagIds} {allTags} {editing} onToggle={toggleTag} />
			</div>
		</div>
	{/if}
{/if}
