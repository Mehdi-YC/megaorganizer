<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { categories = [], onNavigate = () => {} }: {
		categories?: Array<{
			id: string;
			name: string;
			icon?: string;
			iconColor?: string;
			accentColor?: string;
			pages?: Array<{ id: string; name: string; icon?: string }>;
		}>;
		onNavigate?: () => void;
	} = $props();

	let expandedCategories = $state(new Set<string>(
		JSON.parse(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sidebar_expanded') || '[]' : '[]')
	));

	$effect(() => {
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('sidebar_expanded', JSON.stringify([...expandedCategories]));
		}
	});

	let creatingPageFor = $state<string | null>(null);
	let newPageName = $state('');
	let showSearch = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; name: string; type: string }>>([]);

	function toggleCategory(id: string) {
		const next = new Set(expandedCategories);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedCategories = next;
	}

	function isCategoryActive(cat: any): boolean {
		const path = page.url.pathname;
		if (path === `/app/category/${cat.id}`) return true;
		if (cat.pages?.some((p: any) => path.includes(`/page/${p.id}`))) return true;
		return false;
	}

	function isPageActive(pgId: string): boolean {
		return page.url.pathname.includes(`/page/${pgId}`);
	}

	$effect(() => {
		const path = page.url.pathname;
		for (const cat of categories) {
			if (path.includes(`/category/${cat.id}`)) {
				const next = new Set(expandedCategories);
				if (!next.has(cat.id)) {
					next.add(cat.id);
					expandedCategories = next;
				}
			}
		}
	});

	async function createPage(catId: string) {
		if (!newPageName.trim()) return;
		const res = await fetch('/api/pages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: catId, name: newPageName })
		});
		if (res.ok) {
			const pg = await res.json();
			newPageName = '';
			creatingPageFor = null;
			await invalidateAll();
			const next = new Set(expandedCategories);
			next.add(catId);
			expandedCategories = next;
			onNavigate();
			goto(`/app/category/${catId}/page/${pg.id}`);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			showSearch = !showSearch;
			searchQuery = '';
			searchResults = [];
		}
		if (e.key === 'Escape' && showSearch) {
			showSearch = false;
		}
	}

	async function doSearch() {
		if (!searchQuery.trim()) { searchResults = []; return; }
		const res = await fetch(`/api/tree?search=${encodeURIComponent(searchQuery)}`);
		if (res.ok) searchResults = await res.json();
	}

	function navigateSearchResult(result: any) {
		showSearch = false;
		searchQuery = '';
		searchResults = [];
		onNavigate();
		goto(`/app/item/${result.id}`);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showSearch}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:pt-[15vh] bg-surface-overlay" onclick={() => (showSearch = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="w-full max-w-md rounded-sm border border-border bg-surface shadow-xl" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3 border-b border-border px-4 py-3">
				<i class="fas fa-search text-sm text-fg-subdued"></i>
				<input type="text" bind:value={searchQuery} oninput={doSearch} placeholder="Search..." class="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subdued focus:outline-none" />
				<kbd class="hidden sm:inline rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-subdued">ESC</kbd>
			</div>
			{#if searchResults.length > 0}
				<div class="max-h-60 overflow-y-auto py-1">
					{#each searchResults as result}
						<button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted" onclick={() => navigateSearchResult(result)}>
							<i class="fas {result.type === 'node' ? 'fa-folder' : 'fa-cube'} w-4 text-center text-xs text-fg-subdued"></i>
							<div class="flex-1 min-w-0">
								<p class="truncate text-fg">{result.name}</p>
								<p class="text-[11px] capitalize text-fg-subdued">{result.type}</p>
							</div>
						</button>
					{/each}
				</div>
			{:else if searchQuery.trim()}
				<div class="px-4 py-8 text-center text-sm text-fg-subdued">No results found</div>
			{/if}
		</div>
	</div>
{/if}

<aside class="flex h-full w-64 flex-col bg-bg-subdued border-r border-border shrink-0">
	<div class="flex h-12 items-center gap-2.5 border-b border-border px-4">
		<div class="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-white">M</div>
		<span class="text-sm font-bold text-fg-accent tracking-wide uppercase">MegaOrganize</span>
	</div>

	<div class="px-3 pt-3 pb-1">
		<button type="button" class="flex h-8 w-full items-center gap-2 rounded-sm border border-border bg-bg px-2.5 text-xs text-fg-subdued transition-colors hover:border-fg-subdued" onclick={() => { showSearch = true; searchQuery = ''; searchResults = []; }}>
			<i class="fas fa-search text-[10px]"></i>
			<span class="flex-1 text-left">Search...</span>
			<kbd class="rounded-sm bg-muted px-1 py-0.5 text-[9px] font-medium text-fg-subdued hidden sm:inline">⌘K</kbd>
		</button>
	</div>

	<nav class="flex-1 overflow-y-auto py-2 px-2">
		<a href="/app" onclick={onNavigate} class="mb-1 flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page.url.pathname === '/app' ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
			<i class="fas fa-home w-4 text-center text-xs"></i>
			Dashboard
		</a>

		<div class="mb-1">
			<div class="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-fg-subdued">
				<i class="fas fa-dumbbell w-4 text-center text-xs"></i>
				<span class="font-medium">Training</span>
			</div>
			<div class="ml-7 space-y-0.5">
				<a href="/app/training" onclick={onNavigate} class="flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] transition-colors {page.url.pathname === '/app/training' ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
					<i class="fas fa-calendar w-3 text-center text-[10px]"></i> Overview
				</a>
				<a href="/app/training/calendar" onclick={onNavigate} class="flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] transition-colors {page.url.pathname.startsWith('/app/training/calendar') ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
					<i class="fas fa-calendar-days w-3 text-center text-[10px]"></i> Calendar
				</a>
				<a href="/app/training/running" onclick={onNavigate} class="flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] transition-colors {page.url.pathname.startsWith('/app/training/running') ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
					<i class="fas fa-person-running w-3 text-center text-[10px]"></i> Running
				</a>
				<a href="/app/training/history" onclick={onNavigate} class="flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] transition-colors {page.url.pathname.startsWith('/app/training/history') ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
					<i class="fas fa-clock-rotate-left w-3 text-center text-[10px]"></i> History
				</a>
			</div>
		</div>

		<a href="/app/library" onclick={onNavigate} class="mb-1 flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page.url.pathname === '/app/library' ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
			<i class="fas fa-cubes w-4 text-center text-xs"></i>
			Item Library
		</a>

		<a href="/app/tags" onclick={onNavigate} class="mb-2 flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page.url.pathname === '/app/tags' ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}">
			<i class="fas fa-tags w-4 text-center text-xs"></i>
			Tags
		</a>

		<div class="h-px bg-border my-1"></div>

		{#each categories as cat}
			{@const isActive = isCategoryActive(cat)}
			{@const isExpanded = expandedCategories.has(cat.id)}

			<div class="flex items-center">
				<button
					type="button"
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-subdued hover:text-fg hover:bg-muted transition-colors"
					onclick={(e) => { e.stopPropagation(); e.preventDefault(); toggleCategory(cat.id); }}
				>
					<i class="fas fa-chevron-right text-[9px] transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}"></i>
				</button>
				<a
					href="/app/category/{cat.id}"
					onclick={onNavigate}
					class="flex flex-1 items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors {isActive ? 'text-fg-accent' : 'text-fg-subdued hover:text-fg hover:bg-muted'}"
				>
					{#if cat.icon}
						<i class="fas {cat.icon} w-4 text-center text-xs" style="color: {cat.iconColor || 'var(--color-primary)'}"></i>
					{:else}
						<i class="fas fa-folder w-4 text-center text-xs text-fg-subdued"></i>
					{/if}
					<span class="flex-1 truncate text-[11px] font-bold uppercase tracking-wider">{cat.name}</span>
				</a>
				<button
					type="button"
					class="mr-1 h-5 w-5 shrink-0 items-center justify-center rounded-sm text-fg-subdued hover:text-fg hover:bg-muted"
					title="Add Page"
					onclick={(e) => { e.stopPropagation(); e.preventDefault(); creatingPageFor = creatingPageFor === cat.id ? null : cat.id; newPageName = ''; }}
				>
					<i class="fas fa-plus text-[9px]"></i>
				</button>
			</div>

			{#if isExpanded}
				<div class="ml-7 mb-1">
					{#if cat.pages && cat.pages.length > 0}
						{#each cat.pages as pg}
							<a
								href="/app/category/{cat.id}/page/{pg.id}"
								onclick={onNavigate}
								class="flex items-center gap-2 rounded-sm px-2.5 py-1 text-[13px] transition-colors {isPageActive(pg.id) ? 'bg-primary-subdued text-primary font-medium' : 'text-fg-subdued hover:text-fg hover:bg-muted'}"
							>
								<i class="fas fa-file w-3 text-center text-[10px]"></i>
								<span class="truncate">{pg.name}</span>
							</a>
						{/each}
					{:else}
						<p class="px-2.5 py-1 text-[11px] text-fg-subdued italic">No pages</p>
					{/if}

					{#if creatingPageFor === cat.id}
						<form onsubmit={(e) => { e.preventDefault(); createPage(cat.id); }} class="flex items-center gap-1 px-1.5 py-1">
							<input type="text" bind:value={newPageName} placeholder="Page name" class="flex-1 h-7 rounded-sm border border-border bg-bg px-2 text-[11px] text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
							<button type="submit" class="h-7 w-7 shrink-0 rounded-sm bg-primary flex items-center justify-center text-white hover:bg-primary-hover"><i class="fas fa-check text-[9px]"></i></button>
							<button type="button" class="h-7 w-7 shrink-0 rounded-sm bg-muted flex items-center justify-center text-fg hover:bg-border" onclick={() => { creatingPageFor = null; newPageName = ''; }}><i class="fas fa-times text-[9px]"></i></button>
						</form>
					{/if}
				</div>
			{/if}
		{/each}

		<div class="mt-2 px-2">
			<a href="/app/category/new" onclick={onNavigate} class="flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] text-fg-subdued transition-colors hover:text-fg hover:bg-muted">
				<i class="fas fa-plus w-4 text-center text-xs"></i>
				Add Category
			</a>
		</div>
	</nav>

	<div class="border-t border-border p-3">
		<div class="flex items-center gap-2.5 rounded-sm px-2 py-1.5">
			<div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">T</div>
			<div class="flex-1 truncate text-xs text-fg">Test User</div>
		</div>
	</div>
</aside>
