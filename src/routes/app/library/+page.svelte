<script lang="ts">
	import { onMount } from 'svelte';
	import { checkSmallImages, getAssignedTags, toggleArrayItem, DEFAULT_TAG_COLOR } from '$lib/utils';
	import { GridItemImage, TagChips } from '$lib/components/ui';

	let items = $state<any[]>([]);
	let allTags = $state<any[]>([]);
	let searchQuery = $state('');
	let loading = $state(true);
	let showNewItem = $state(false);
	let newItemName = $state('');
	let allItems = $state<any[]>([]);
	let filterTagIds = $state<string[]>([]);
	let filterYdk = $state(false);
	let showFilters = $state(false);
	let smallImages = $state(new Set<string>());
	let currentPage = $state(1);
	const PAGE_SIZE = 50;

	onMount(async () => {
		const [itemsRes, tagsRes] = await Promise.all([fetch('/api/tree'), fetch('/api/tags')]);
		if (itemsRes.ok) allItems = await itemsRes.json();
		if (tagsRes.ok) allTags = await tagsRes.json();
		loading = false;
		filterItems();
		checkSmallImages(allItems, (ids) => smallImages = ids, smallImages);
	});

	function filterItems() {
		let result = allItems.filter((item: any) => item.type !== 'node');

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter((item: any) =>
				item.name?.toLowerCase().includes(q) ||
				item.description?.toLowerCase().includes(q) ||
				item.markdown?.toLowerCase().includes(q)
			);
		}

		if (filterTagIds.length > 0) {
			result = result.filter((item: any) => {
				let ids: string[] = [];
				try { ids = item.tags ? JSON.parse(item.tags) : []; } catch { ids = []; }
				return filterTagIds.some((tid) => ids.includes(tid));
			});
		}

		if (filterYdk) {
			result = result.filter((item: any) => !!item.ydkData);
		}

		items = result;
		currentPage = 1;
	}

	function toggleFilterTag(tagId: string) {
		filterTagIds = toggleArrayItem(filterTagIds, tagId);
		filterItems();
	}

	function toggleFilterYdk() {
		filterYdk = !filterYdk;
		filterItems();
	}

	function clearFilters() {
		filterTagIds = [];
		filterYdk = false;
		searchQuery = '';
		filterItems();
	}

	let hasActiveFilters = $derived(filterTagIds.length > 0 || filterYdk);
	let totalPages = $derived(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
	let paginatedItems = $derived(items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	async function createItem() {
		if (!newItemName.trim()) return;
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name: newItemName })
		});
		if (res.ok) {
			const item = await res.json();
			newItemName = '';
			showNewItem = false;
			const r = await fetch('/api/tree');
			if (r.ok) allItems = await r.json();
			filterItems();
			window.location.href = `/app/item/${item.id}`;
		}
	}
</script>

<svelte:head><title>Item Library - MegaOrganize</title></svelte:head>

<div class="p-4 sm:p-6">
	<div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold text-fg-accent">Item Library</h1>
			<p class="mt-1 text-sm text-fg-subdued">{items.length} items</p>
		</div>
		<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover" onclick={() => (showNewItem = true)}>
			<i class="fas fa-plus text-xs"></i> <span class="hidden sm:inline">New Item</span>
		</button>
	</div>

	{#if showNewItem}
		<div class="mb-4 rounded-sm border border-border bg-surface p-3 sm:p-4">
			<form onsubmit={(e) => { e.preventDefault(); createItem(); }} class="flex gap-2">
				<input type="text" bind:value={newItemName} placeholder="Item name" class="flex-1 min-w-0 h-9 rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
				<button type="submit" class="h-9 shrink-0 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">Create</button>
				<button type="button" aria-label="Close" class="h-9 shrink-0 rounded-sm bg-muted px-3 text-sm font-medium text-fg hover:bg-border" onclick={() => { showNewItem = false; newItemName = ''; }}><i class="fas fa-times text-xs"></i></button>
			</form>
		</div>
	{/if}

	<div class="mb-4 space-y-3">
		<div class="flex items-center gap-2">
			<div class="relative flex-1">
				<i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-fg-subdued text-xs"></i>
				<input
					type="search"
					placeholder="Search items..."
					bind:value={searchQuery}
					oninput={filterItems}
					class="h-9 w-full rounded-sm border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
				/>
			</div>
			<button type="button" class="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border {hasActiveFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-bg text-fg-subdued hover:bg-muted hover:text-fg'} px-3 text-xs font-medium transition-colors" onclick={() => (showFilters = !showFilters)}>
				<i class="fas fa-filter text-[10px]"></i>
				{#if hasActiveFilters}<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white">{filterTagIds.length + (filterYdk ? 1 : 0)}</span>{/if}
			</button>
		</div>

		{#if showFilters}
			<div class="rounded-sm border border-border bg-surface p-3">
				<div class="flex items-center justify-between mb-2">
					<span class="text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Filters</span>
					{#if hasActiveFilters}
						<button type="button" class="text-[10px] text-primary hover:text-primary-hover" onclick={clearFilters}>Clear all</button>
					{/if}
				</div>
				<div class="space-y-2">
					<div>
						<p class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subdued">Tags</p>
						<div class="flex flex-wrap gap-1">
							{#each allTags as t}
								<button type="button" class="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-medium transition-all {filterTagIds.includes(t.id) ? 'text-white ring-1 ring-white/20' : 'bg-muted text-fg-subdued hover:text-fg'}" style={filterTagIds.includes(t.id) ? `background: ${t.color || '#5A31F4'}` : ''} onclick={() => toggleFilterTag(t.id)}>
									<span class="h-2 w-2 rounded-full" style="background: {t.color || '#5A31F4'}"></span>
									{t.name}
								</button>
							{:else}
								<span class="text-[10px] text-fg-subdued italic">No tags</span>
							{/each}
						</div>
					</div>
					<div>
						<button type="button" class="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] font-medium transition-all {filterYdk ? 'bg-primary text-white' : 'bg-muted text-fg-subdued hover:text-fg'}" onclick={toggleFilterYdk}>
							<i class="fas fa-layer-group text-[9px]"></i> Decks only
						</button>
					</div>
				</div>
		</div>
		{/if}
		{#if totalPages > 1}
			<div class="mt-4 flex items-center justify-center gap-2">
				<button type="button" class="h-8 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={currentPage <= 1} onclick={() => (currentPage = currentPage - 1)}>
					<i class="fas fa-chevron-left text-[9px]"></i> Prev
				</button>
				<span class="text-xs text-fg-subdued">Page {currentPage} of {totalPages}</span>
				<button type="button" class="h-8 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed" disabled={currentPage >= totalPages} onclick={() => (currentPage = currentPage + 1)}>
					Next <i class="fas fa-chevron-right text-[9px]"></i>
				</button>
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-16"><div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
	{:else if items.length === 0}
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-cubes mb-3 text-3xl text-fg-subdued"></i>
			<p class="text-sm text-fg-subdued">{hasActiveFilters || searchQuery ? 'No items match filters' : 'No items yet'}</p>
		</div>
	{:else}
		<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each paginatedItems as item}
				{@const itemTags = getAssignedTags(item, allTags)}
				<a href="/app/item/{item.id}" class="group rounded-sm border border-border bg-surface transition-all hover:border-primary/50">
					<div class="h-24 overflow-hidden rounded-t-sm">
						<GridItemImage src={item.imageUrl} alt={item.name} height="h-24" icon={item.ydkData ? 'fa-layer-group' : 'fa-cube'} />
					</div>
					<div class="p-2.5">
						<h3 class="truncate text-xs font-medium text-fg-accent group-hover:text-primary">{item.name}</h3>
						<p class="mt-0.5 text-[10px] capitalize text-fg-subdued">{item.type}{#if item.ydkData} · Deck{/if}</p>
						{#if itemTags.length > 0}
							<div class="mt-1.5 flex flex-wrap gap-1">
								<TagChips tags={itemTags.slice(0, 3)} size="xs" />
								{#if itemTags.length > 3}
									<span class="rounded-sm bg-muted px-1 py-0.5 text-[9px] text-fg-subdued">+{itemTags.length - 3}</span>
								{/if}
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
