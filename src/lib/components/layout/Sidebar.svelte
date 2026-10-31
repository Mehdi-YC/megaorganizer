<script lang="ts">
	import type { CategoryWithPages, PageSummary, EnabledFeatures } from '$lib/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ConfirmButton from '$lib/components/ui/ConfirmButton.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { themeState } from '$lib/utils/theme.svelte';

	let {
		categories = [],
		invoiceYears = [],
		enabledFeatures = {
			todos: true,
			reminders: true,
			finance: true,
			invoicing: true,
			training: true,
			ydk: true
		},
		user,
		onNavigate = () => {}
	}: {
		categories?: CategoryWithPages[];
		invoiceYears?: number[];
		enabledFeatures?: EnabledFeatures;
		user?: { name: string; email: string; image?: string | null };
		onNavigate?: () => void;
	} = $props();

	let collapsed = $state(
		typeof localStorage !== 'undefined'
			? localStorage.getItem('sidebar_collapsed') === 'true'
			: false
	);

	function toggleCollapse() {
		collapsed = !collapsed;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('sidebar_collapsed', String(collapsed));
		}
	}

	let invoicingExpanded = $state(
		typeof sessionStorage !== 'undefined'
			? sessionStorage.getItem('sidebar_invoicing_expanded') !== 'false'
			: true
	);

	let expandedInvoiceYears = $state(
		new Set<number>(
			JSON.parse(
				typeof sessionStorage !== 'undefined'
					? sessionStorage.getItem('sidebar_invoice_years') || '[]'
					: '[]'
			)
		)
	);

	function toggleInvoicing() {
		invoicingExpanded = !invoicingExpanded;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('sidebar_invoicing_expanded', String(invoicingExpanded));
		}
	}

	function toggleInvoiceYear(year: number) {
		const next = new Set(expandedInvoiceYears);
		if (next.has(year)) next.delete(year);
		else next.add(year);
		expandedInvoiceYears = next;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('sidebar_invoice_years', JSON.stringify([...next]));
		}
	}

	async function exportYearFromSidebar(e: Event, year: number) {
		e.stopPropagation();
		e.preventDefault();
		try {
			showToast(`Exportation du dossier ${year}...`, 'info');
			const res = await fetch('/api/invoicing/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exportType: 'year', year })
			});
			if (!res.ok) throw new Error('Erreur');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `dossier-fiscal-${year}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(`Dossier ${year} exporté avec succès`, 'success');
		} catch {
			showToast("Échec de l'exportation du dossier", 'error');
		}
	}

	let expandedCategories = $state(
		new Set<string>(
			JSON.parse(
				typeof sessionStorage !== 'undefined'
					? sessionStorage.getItem('sidebar_expanded') || '[]'
					: '[]'
			)
		)
	);

	$effect(() => {
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('sidebar_expanded', JSON.stringify([...expandedCategories]));
		}
	});

	let creatingPageFor = $state<string | null>(null);
	let newPageName = $state('');
	let searchQuery = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let searchSearched = $state(false);
	let searchResults = $state<
		Array<{
			id: string;
			title: string;
			type: string;
			subtitle?: string;
			icon: string;
			url: string;
			imageUrl?: string;
		}>
	>([]);
	let showUserMenu = $state(false);
	let confirmDeleteCatId = $state<string | null>(null);

	function toggleCategory(id: string) {
		const next = new Set(expandedCategories);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedCategories = next;
	}

	function isCategoryActive(cat: CategoryWithPages): boolean {
		const path = page.url.pathname;
		if (path === `/app/category/${cat.id}`) return true;
		if (cat.pages?.some((p: PageSummary) => path.includes(`/page/${p.id}`))) return true;
		return false;
	}

	function isPageActive(pgId: string): boolean {
		return page.url.pathname.includes(`/page/${pgId}`);
	}

	async function deleteCategory(catId: string) {
		const res = await fetch('/api/categories', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: catId })
		});
		if (res.ok) {
			confirmDeleteCatId = null;
			showToast('Category deleted', 'success');
			await invalidateAll();
			if (page.url.pathname.includes(`/category/${catId}`)) {
				goto(resolve('/app'));
			}
		}
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
			showToast('Page created', 'success');
			await invalidateAll();
			const next = new Set(expandedCategories);
			next.add(catId);
			expandedCategories = next;
			onNavigate();
			goto(resolve('/app/category/[id]/page/[pageId]', { id: catId, pageId: pg.id }));
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (collapsed) {
				collapsed = false;
				setTimeout(() => {
					searchInput?.focus();
					searchInput?.select();
				}, 100);
			} else {
				searchInput?.focus();
				searchInput?.select();
			}
		}
		if (e.key === 'Escape') {
			if (document.activeElement === searchInput) {
				searchInput?.blur();
			}
			if (showUserMenu) {
				showUserMenu = false;
			}
			if (confirmDeleteCatId) {
				confirmDeleteCatId = null;
			}
		}
	}

	let searchSeq = 0;

	function scheduleSearch() {
		searchSearched = false;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(doSearch, 250);
	}

	async function doSearch() {
		if (!searchQuery.trim() || searchQuery.trim().length < 2) {
			searchResults = [];
			return;
		}
		const seq = ++searchSeq;
		const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
		if (res.ok && seq === searchSeq) {
			searchResults = await res.json();
			searchSearched = true;
		}
	}

	function navigateSearchResult(result: {
		id: string;
		title: string;
		type: string;
		url: string;
		imageUrl?: string;
	}) {
		searchQuery = '';
		searchSearched = false;
		searchResults = [];
		onNavigate();
		// Search results carry a path built by the server, which resolve() cannot
		// type-check at compile time.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(result.url);
	}

	function getUserInitial(): string {
		if (user?.name) return user.name.charAt(0).toUpperCase();
		return '?';
	}

	async function handleLogout() {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/logout';
		document.body.appendChild(form);
		form.submit();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="flex h-full flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-200 select-none {collapsed
		? 'w-16'
		: 'w-64'}"
>
	<!-- Top Workspace Header -->
	<div class="flex h-14 items-center justify-between border-b border-sidebar-border px-3.5">
		{#if !collapsed}
			<div class="flex min-w-0 items-center gap-2.5">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-xs"
				>
					<i class="fas fa-layer-group text-xs"></i>
				</div>
				<div class="flex min-w-0 items-center gap-1.5">
					<span class="truncate text-sm font-semibold tracking-tight text-fg">MegaOrganize</span>
					<i class="fas fa-chevron-down text-[10px] text-fg-subdued/80"></i>
				</div>
			</div>
		{:else}
			<div
				class="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-xs"
			>
				<i class="fas fa-layer-group text-xs"></i>
			</div>
		{/if}

		<!-- Collapse toggle button -->
		<button
			type="button"
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			class="hidden h-7 w-7 cursor-pointer items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg lg:flex"
			onclick={toggleCollapse}
		>
			<i class="fas {collapsed ? 'fa-angles-right' : 'fa-angles-left'} text-xs"></i>
		</button>
	</div>

	<!-- Quick Search Bar -->
	{#if !collapsed}
		<div class="relative px-3 pt-3 pb-1">
			<SearchInput
				bind:value={searchQuery}
				bind:inputEl={searchInput}
				placeholder="Search..."
				shortcut="⌘K"
				onsearch={scheduleSearch}
			/>

			{#if searchSearched && searchQuery.trim().length >= 2}
				<div
					class="absolute top-full right-3 left-3 z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-2xl"
				>
					{#if searchResults.length > 0}
						{#each searchResults as result (result.url)}
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
								onclick={() => navigateSearchResult(result)}
							>
								{#if result.imageUrl}
									<img
										src={result.imageUrl}
										alt={result.title}
										class="h-7 w-7 shrink-0 rounded-md object-cover"
									/>
								{:else}
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-fg-subdued"
									>
										<i class="fas {result.icon} text-xs"></i>
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-fg">{result.title}</p>
									<p class="truncate text-[10px] text-fg-subdued">
										{result.subtitle || result.type}
									</p>
								</div>
							</button>
						{/each}
					{:else}
						<div class="px-4 py-6 text-center">
							<i class="fas fa-search mb-2 text-xl text-fg-subdued/30"></i>
							<p class="text-xs text-fg-subdued">No results found</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex justify-center pt-3 pb-1">
			<button
				type="button"
				aria-label="Search"
				title="Search (⌘K)"
				class="flex h-9 w-9 items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				onclick={() => {
					collapsed = false;
					setTimeout(() => {
						searchInput?.focus();
					}, 100);
				}}
			>
				<i class="fas fa-search text-xs"></i>
			</button>
		</div>
	{/if}

	<!-- Navigation Menu -->
	<nav class="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-2">
		<!-- Section: CORE -->
		<div class="space-y-0.5">
			{#if !collapsed}
				<div
					class="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-fg-subdued/80 uppercase"
				>
					Main
				</div>
			{/if}

			<a
				href={resolve('/app')}
				onclick={onNavigate}
				title="Dashboard"
				class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
					? 'justify-center px-0'
					: 'px-2.5'} {page.url.pathname === '/app'
					? 'bg-muted font-semibold text-fg'
					: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
			>
				<i class="fas fa-chart-pie w-4 text-center text-xs"></i>
				{#if !collapsed}<span>Dashboard</span>{/if}
			</a>

			{#if enabledFeatures.todos !== false}
				<a
					href={resolve('/app/todos')}
					onclick={onNavigate}
					title="Tasks"
					class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
						? 'justify-center px-0'
						: 'px-2.5'} {page.url.pathname.startsWith('/app/todos')
						? 'bg-muted font-semibold text-fg'
						: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
				>
					<i class="fas fa-check-square w-4 text-center text-xs"></i>
					{#if !collapsed}<span>Tasks</span>{/if}
				</a>
			{/if}

			<a
				href={resolve('/app/calendar')}
				onclick={onNavigate}
				title="Calendar"
				class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
					? 'justify-center px-0'
					: 'px-2.5'} {page.url.pathname === '/app/calendar'
					? 'bg-muted font-semibold text-fg'
					: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
			>
				<i class="fas fa-calendar-days w-4 text-center text-xs"></i>
				{#if !collapsed}<span>Calendar</span>{/if}
			</a>

			{#if enabledFeatures.reminders !== false}
				<a
					href={resolve('/app/reminders')}
					onclick={onNavigate}
					title="Reminders"
					class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
						? 'justify-center px-0'
						: 'px-2.5'} {page.url.pathname.startsWith('/app/reminders')
						? 'bg-muted font-semibold text-fg'
						: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
				>
					<i class="fas fa-bell w-4 text-center text-xs"></i>
					{#if !collapsed}<span>Reminders</span>{/if}
				</a>
			{/if}
		</div>

		<!-- Section: FINANCE & FACTURATION -->
		{#if (enabledFeatures.finance !== false || enabledFeatures.invoicing !== false) && !collapsed}
			<div class="space-y-0.5">
				<div
					class="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-fg-subdued/80 uppercase"
				>
					Finance
				</div>

				{#if enabledFeatures.finance !== false}
					<a
						href={resolve('/app/finance')}
						onclick={onNavigate}
						class="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-colors {page
							.url.pathname === '/app/finance'
							? 'bg-muted font-semibold text-fg'
							: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
					>
						<i class="fas fa-wallet w-4 text-center text-xs"></i>
						<span>Expenses</span>
					</a>
				{/if}

				{#if enabledFeatures.invoicing !== false}
					<div class="space-y-0.5">
						<div
							class="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium transition-colors {page
								.url.pathname === '/app/invoicing'
								? 'bg-muted font-semibold text-fg'
								: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
						>
							<a
								href={resolve('/app/invoicing')}
								onclick={onNavigate}
								class="flex flex-1 items-center gap-2.5"
							>
								<i class="fas fa-file-invoice-dollar w-4 text-center text-xs"></i>
								<span>Invoicing</span>
							</a>
							<button
								type="button"
								aria-label="Toggle invoicing"
								class="flex h-6 w-6 items-center justify-center rounded text-fg-subdued hover:text-fg"
								onclick={(e) => {
									e.stopPropagation();
									toggleInvoicing();
								}}
							>
								<i
									class="fas fa-chevron-right text-[9px] transition-transform duration-150 {invoicingExpanded
										? 'rotate-90'
										: ''}"
								></i>
							</button>
						</div>

						{#if invoicingExpanded}
							<div class="ml-4 space-y-0.5 border-l border-border/60 pl-2">
								<a
									href={resolve('/app/invoicing/clients')}
									onclick={onNavigate}
									class="flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors {page
										.url.pathname === '/app/invoicing/clients'
										? 'bg-muted font-medium text-fg'
										: 'text-fg-subdued hover:text-fg'}"
								>
									<i class="fas fa-users w-3.5 text-center text-[10px]"></i>
									<span>Clients</span>
								</a>

								<a
									href={resolve('/app/invoicing/products')}
									onclick={onNavigate}
									class="flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors {page
										.url.pathname === '/app/invoicing/products'
										? 'bg-muted font-medium text-fg'
										: 'text-fg-subdued hover:text-fg'}"
								>
									<i class="fas fa-cubes-stacked w-3.5 text-center text-[10px]"></i>
									<span>Products & Rates</span>
								</a>

								{#each invoiceYears.length > 0 ? invoiceYears : [new Date().getFullYear()] as yr (yr)}
									{@const isYrExpanded = expandedInvoiceYears.has(yr)}
									{@const isYrActive = page.url.pathname === `/app/invoicing/year/${yr}`}

									<div class="space-y-0.5">
										<div class="flex items-center justify-between rounded-md pr-1">
											<button
												type="button"
												aria-label="Toggle dossier {yr}"
												class="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center text-fg-subdued hover:text-fg"
												onclick={(e) => {
													e.stopPropagation();
													toggleInvoiceYear(yr);
												}}
											>
												<i
													class="fas fa-chevron-right text-[8px] transition-transform duration-150 {isYrExpanded
														? 'rotate-90'
														: ''}"
												></i>
											</button>
											<a
												href={resolve('/app/invoicing/year/[year]', { year: String(yr) })}
												onclick={onNavigate}
												class="flex flex-1 items-center gap-1.5 py-1 text-xs transition-colors {isYrActive
													? 'font-semibold text-fg'
													: 'text-fg-subdued hover:text-fg'}"
											>
												<i class="fas fa-folder text-[10px] text-primary-text"></i>
												<span>{yr}</span>
											</a>
											<button
												type="button"
												class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-fg-subdued hover:text-primary-text"
												title="Export year zip"
												onclick={(e) => exportYearFromSidebar(e, yr)}
											>
												<i class="fas fa-file-zipper text-[10px]"></i>
											</button>
										</div>

										{#if isYrExpanded}
											<div class="ml-3 space-y-0.5 border-l border-border/40 pl-2">
												<a
													href={resolve('/app/invoicing/year/[year]', { year: String(yr) })}
													onclick={onNavigate}
													class="flex h-6 items-center gap-1.5 text-[11px] text-fg-subdued hover:text-fg"
												>
													<i class="fas fa-file-shield text-[9px]"></i>
													<span>G12 / G12 bis</span>
												</a>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Section: CATEGORIES & PAGES (Workspaces) -->
		{#if !collapsed}
			<div class="space-y-0.5">
				<div class="flex items-center justify-between px-2.5 py-1">
					<span class="text-[10px] font-semibold tracking-wider text-fg-subdued/80 uppercase">
						Workspaces
					</span>
					<a
						href={resolve('/app/category/new')}
						onclick={onNavigate}
						title="New Category"
						class="flex h-4 w-4 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-fg"
					>
						<i class="fas fa-plus text-[9px]"></i>
					</a>
				</div>

				{#each categories as cat (cat.id)}
					{@const isActive = isCategoryActive(cat)}
					{@const isExpanded = expandedCategories.has(cat.id)}

					<div class="space-y-0.5">
						<div
							class="group flex h-8 items-center justify-between rounded-lg px-2 text-xs font-medium transition-colors {isActive
								? 'bg-muted font-semibold text-fg'
								: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
						>
							<button
								type="button"
								aria-label="Toggle category"
								class="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center text-fg-subdued hover:text-fg"
								onclick={(e) => {
									e.stopPropagation();
									toggleCategory(cat.id);
								}}
							>
								<i
									class="fas fa-chevron-right text-[8px] transition-transform duration-150 {isExpanded
										? 'rotate-90'
										: ''}"
								></i>
							</button>

							<a
								href={resolve('/app/category/[id]', { id: cat.id })}
								onclick={onNavigate}
								class="flex flex-1 items-center gap-2 truncate py-1 text-inherit"
							>
								<!-- Colored indicator dot / icon like in the screenshot -->
								<span
									class="h-2 w-2 shrink-0 rounded-xs"
									style="background-color: {cat.iconColor || 'var(--color-primary)'}"
								></span>
								<span class="truncate">{cat.name}</span>
							</a>

							<div
								class="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									type="button"
									class="flex h-6 w-6 items-center justify-center rounded text-fg-subdued hover:text-fg"
									title="Add Page"
									onclick={(e) => {
										e.stopPropagation();
										creatingPageFor = creatingPageFor === cat.id ? null : cat.id;
										newPageName = '';
									}}
								>
									<i class="fas fa-plus text-[9px]"></i>
								</button>
								<ConfirmButton
									confirmId={confirmDeleteCatId ?? ''}
									targetId={cat.id}
									size="sm"
									onconfirm={() => {
										if (confirmDeleteCatId === cat.id) {
											deleteCategory(cat.id);
										} else {
											confirmDeleteCatId = cat.id;
											setTimeout(() => {
												if (confirmDeleteCatId === cat.id) confirmDeleteCatId = null;
											}, 3000);
										}
									}}
								/>
							</div>
						</div>

						{#if isExpanded}
							<div class="ml-4 space-y-0.5 border-l border-border/50 pl-2">
								{#if cat.pages && cat.pages.length > 0}
									{#each cat.pages as pg (pg.id)}
										<a
											href={resolve('/app/category/[id]/page/[pageId]', {
												id: cat.id,
												pageId: pg.id
											})}
											onclick={onNavigate}
											class="flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors {isPageActive(
												pg.id
											)
												? 'bg-muted font-medium text-fg'
												: 'text-fg-subdued hover:text-fg'}"
										>
											<i class="fas fa-file-lines text-[10px] text-fg-subdued"></i>
											<span class="truncate">{pg.name}</span>
										</a>
									{/each}
								{:else}
									<p class="px-2 py-1 text-[11px] text-fg-subdued italic">Empty workspace</p>
								{/if}

								{#if creatingPageFor === cat.id}
									<form
										onsubmit={(e) => {
											e.preventDefault();
											createPage(cat.id);
										}}
										class="flex items-center gap-1 py-1"
									>
										<Input
											size="sm"
											bind:value={newPageName}
											placeholder="Page name"
											class="flex-1"
										/>
										<button
											type="submit"
											aria-label="Create page"
											class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-white"
										>
											<i class="fas fa-check text-[9px]"></i>
										</button>
										<button
											type="button"
											aria-label="Cancel"
											class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted text-fg"
											onclick={() => {
												creatingPageFor = null;
												newPageName = '';
											}}
										>
											<i class="fas fa-times text-[9px]"></i>
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Section: MORE MODULES -->
		<div class="space-y-0.5">
			{#if !collapsed}
				<div
					class="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-fg-subdued/80 uppercase"
				>
					Modules
				</div>
			{/if}

			<a
				href={resolve('/app/library')}
				onclick={onNavigate}
				title="Library"
				class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
					? 'justify-center px-0'
					: 'px-2.5'} {page.url.pathname === '/app/library'
					? 'bg-muted font-semibold text-fg'
					: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
			>
				<i class="fas fa-book-open w-4 text-center text-xs"></i>
				{#if !collapsed}<span>Library</span>{/if}
			</a>

			<a
				href={resolve('/app/mindmap')}
				onclick={onNavigate}
				title="Mindmap"
				class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
					? 'justify-center px-0'
					: 'px-2.5'} {page.url.pathname === '/app/mindmap'
					? 'bg-muted font-semibold text-fg'
					: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
			>
				<i class="fas fa-network-wired w-4 text-center text-xs"></i>
				{#if !collapsed}<span>Mindmap</span>{/if}
			</a>

			{#if enabledFeatures.training !== false}
				<a
					href={resolve('/app/training')}
					onclick={onNavigate}
					title="Training"
					class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
						? 'justify-center px-0'
						: 'px-2.5'} {page.url.pathname.startsWith('/app/training')
						? 'bg-muted font-semibold text-fg'
						: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
				>
					<i class="fas fa-person-running w-4 text-center text-xs"></i>
					{#if !collapsed}<span>Training</span>{/if}
				</a>
			{/if}

			<a
				href={resolve('/app/tags')}
				onclick={onNavigate}
				title="Tags"
				class="flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors {collapsed
					? 'justify-center px-0'
					: 'px-2.5'} {page.url.pathname === '/app/tags'
					? 'bg-muted font-semibold text-fg'
					: 'text-fg-subdued hover:bg-muted/60 hover:text-fg'}"
			>
				<i class="fas fa-tag w-4 text-center text-xs"></i>
				{#if !collapsed}<span>Tags</span>{/if}
			</a>
		</div>
	</nav>

	<!-- Footer: Theme Switcher & User Profile -->
	<div class="space-y-1 border-t border-sidebar-border p-2">
		<!-- Quick theme toggle pill -->
		{#if !collapsed}
			<button
				type="button"
				class="flex h-8 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-xs text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				onclick={() => themeState.toggle()}
			>
				<div class="flex items-center gap-2">
					<i class="fas {themeState.resolved === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs"></i>
					<span>{themeState.resolved === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
				</div>
				<span
					class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-fg-subdued capitalize"
				>
					{themeState.theme}
				</span>
			</button>
		{:else}
			<button
				type="button"
				title="Toggle Theme"
				aria-label="Toggle Theme"
				class="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				onclick={() => themeState.toggle()}
			>
				<i class="fas {themeState.resolved === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs"></i>
			</button>
		{/if}

		<!-- User row -->
		<div class="relative">
			<button
				type="button"
				class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-muted"
				onclick={() => (showUserMenu = !showUserMenu)}
			>
				<div
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-xs font-bold text-primary-text"
				>
					{getUserInitial()}
				</div>
				{#if !collapsed}
					<div class="min-w-0 flex-1 text-left">
						<p class="truncate text-xs leading-tight font-semibold text-fg">
							{user?.name || 'User'}
						</p>
						<p class="truncate text-[10px] leading-tight text-fg-subdued">{user?.email || ''}</p>
					</div>
					<i class="fas fa-ellipsis text-xs text-fg-subdued"></i>
				{/if}
			</button>

			{#if showUserMenu}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute {collapsed
						? 'bottom-0 left-full ml-2 w-52'
						: 'right-0 bottom-full left-0 mb-1'} z-50 rounded-xl border border-border bg-surface p-1 shadow-xl"
					onclick={(e) => e.stopPropagation()}
				>
					<div class="border-b border-border/70 px-3 py-2">
						<p class="truncate text-xs font-semibold text-fg">{user?.name}</p>
						<p class="truncate text-[10px] text-fg-subdued">{user?.email}</p>
					</div>
					<div class="py-1">
						<a
							href={resolve('/app/settings/profile')}
							onclick={() => {
								showUserMenu = false;
								onNavigate();
							}}
							class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-fg transition-colors hover:bg-muted"
						>
							<i class="fas fa-gear text-xs text-fg-subdued"></i>
							Settings & Profile
						</a>
						<button
							type="button"
							class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-error transition-colors hover:bg-error/10"
							onclick={handleLogout}
						>
							<i class="fas fa-right-from-bracket text-xs"></i>
							Logout
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</aside>
