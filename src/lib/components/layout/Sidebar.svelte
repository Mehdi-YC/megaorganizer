<script lang="ts">
	import type { CategoryWithPages, PageSummary } from '$lib/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmButton from '$lib/components/ui/ConfirmButton.svelte';
	import { showToast } from '$lib/utils/toast.svelte';

	let {
		categories = [],
		invoiceYears = [],
		user,
		onNavigate = () => {}
	}: {
		categories?: CategoryWithPages[];
		invoiceYears?: number[];
		user?: { name: string; email: string; image?: string | null };
		onNavigate?: () => void;
	} = $props();

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
			searchInput?.focus();
			searchInput?.select();
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

<aside class="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-subdued">
	<div class="flex h-12 items-center gap-2.5 border-b border-border px-4">
		<div
			class="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-white"
		>
			M
		</div>
		<span class="text-sm font-bold tracking-wide text-fg-accent uppercase">MegaOrganize</span>
	</div>

	<div class="relative px-3 pt-3 pb-1">
		<SearchInput
			bind:value={searchQuery}
			bind:inputEl={searchInput}
			placeholder="Search..."
			onsearch={scheduleSearch}
		/>
		{#if searchSearched && searchQuery.trim().length >= 2}
			<div
				class="absolute top-full right-3 left-3 z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-sm border border-border bg-surface py-1 shadow-xl"
			>
				{#if searchResults.length > 0}
					{#each searchResults as result (result.url)}
						<button
							type="button"
							class="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
							onclick={() => navigateSearchResult(result)}
						>
							{#if result.imageUrl}
								<img
									src={result.imageUrl}
									alt={result.title}
									class="h-7 w-7 shrink-0 rounded-sm object-cover"
								/>
							{:else}
								<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-muted">
									<i class="fas {result.icon} text-[10px] text-fg-subdued"></i>
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-fg">{result.title}</p>
								<p class="truncate text-[10px] text-fg-subdued">{result.subtitle || result.type}</p>
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

	<nav class="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
		<a
			href={resolve('/app')}
			onclick={onNavigate}
			class="mb-2 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page
				.url.pathname === '/app'
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-home w-4 text-center text-xs"></i>
			Dashboard
		</a>

		<a
			href={resolve('/app/calendar')}
			onclick={onNavigate}
			class="mb-2 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page
				.url.pathname === '/app/calendar'
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-calendar w-4 text-center text-xs"></i>
			Calendar
		</a>

		<a
			href={resolve('/app/finance')}
			onclick={onNavigate}
			class="mb-2 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page
				.url.pathname === '/app/finance'
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-receipt w-4 text-center text-xs"></i>
			Finance
		</a>

		<!-- Facturation (Collapsible Block) -->
		<div class="mb-2">
			<div
				class="group flex min-h-9 items-center rounded-sm transition-colors {page.url.pathname ===
				'/app/invoicing'
					? 'bg-primary-subdued font-medium text-primary-text'
					: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
			>
				<button
					type="button"
					aria-label="Toggle facturation"
					aria-expanded={invoicingExpanded}
					class="flex h-9 w-7 shrink-0 cursor-pointer items-center justify-center text-inherit opacity-75 hover:opacity-100"
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleInvoicing();
					}}
				>
					<i
						class="fas fa-chevron-right text-[9px] transition-transform duration-150 {invoicingExpanded
							? 'rotate-90'
							: ''}"
					></i>
				</button>
				<a
					href={resolve('/app/invoicing')}
					onclick={onNavigate}
					class="flex flex-1 items-center gap-2 py-1.5 pr-3 text-left text-[13px] text-inherit"
				>
					<i class="fas fa-file-invoice w-4 text-center text-xs"></i>
					<span class="flex-1 truncate">Facturation</span>
				</a>
			</div>

			{#if invoicingExpanded}
				<div class="mt-1 ml-4 space-y-0.5 border-l border-border/50 pl-2">
					<a
						href={resolve('/app/invoicing/clients')}
						onclick={onNavigate}
						class="flex min-h-7 items-center gap-2 rounded-sm px-2 py-1 text-xs transition-colors {page
							.url.pathname === '/app/invoicing/clients'
							? 'bg-primary-subdued font-medium text-primary-text'
							: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
					>
						<i class="fas fa-users w-3.5 text-center text-[10px]"></i>
						<span class="truncate">Clients</span>
					</a>

					<a
						href={resolve('/app/invoicing/products')}
						onclick={onNavigate}
						class="flex min-h-7 items-center gap-2 rounded-sm px-2 py-1 text-xs transition-colors {page
							.url.pathname === '/app/invoicing/products'
							? 'bg-primary-subdued font-medium text-primary-text'
							: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
					>
						<i class="fas fa-box w-3.5 text-center text-[10px]"></i>
						<span class="truncate">Produits & Services</span>
					</a>

					<!-- Folders for each Year -->
					<div class="my-1.5 h-px bg-border/40"></div>
					<div class="px-2 py-0.5 text-[10px] font-semibold text-fg-subdued uppercase">
						Dossiers Annuels
					</div>

					{#each invoiceYears.length > 0 ? invoiceYears : [new Date().getFullYear()] as yr (yr)}
						{@const isYrExpanded = expandedInvoiceYears.has(yr)}
						{@const isYrActive = page.url.pathname === `/app/invoicing/year/${yr}`}

						<div class="space-y-0.5">
							<div class="group flex items-center justify-between rounded-sm pr-1">
								<button
									type="button"
									aria-label="Toggle dossier {yr}"
									class="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center text-fg-subdued hover:text-fg"
									onclick={(e) => {
										e.stopPropagation();
										e.preventDefault();
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
										? 'font-medium text-primary-text'
										: 'text-fg-subdued hover:text-fg'}"
								>
									<i
										class="fas {isYrExpanded
											? 'fa-folder-open'
											: 'fa-folder'} text-[10px] text-primary-text"
									></i>
									<span class="truncate">{yr}</span>
								</a>

								<!-- Export Button for Year Folder -->
								<button
									type="button"
									class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-fg-subdued opacity-70 hover:text-primary-text hover:opacity-100"
									title="Exporter le dossier {yr} (G12, G12 bis & Factures)"
									onclick={(e) => exportYearFromSidebar(e, yr)}
								>
									<i class="fas fa-file-zipper text-[10px]"></i>
								</button>
							</div>

							{#if isYrExpanded}
								<div class="ml-4 space-y-0.5 border-l border-border/40 pl-2">
									<a
										href={resolve('/app/invoicing/year/[year]', { year: String(yr) })}
										onclick={onNavigate}
										class="flex min-h-6 items-center gap-1.5 py-0.5 text-[11px] text-fg-subdued hover:text-fg"
									>
										<i class="fas fa-file-shield text-[9px]"></i>
										<span class="truncate">G12 / G12 bis</span>
									</a>
									<a
										href={resolve('/app/invoicing')}
										onclick={onNavigate}
										class="flex min-h-6 items-center gap-1.5 py-0.5 text-[11px] text-fg-subdued hover:text-fg"
									>
										<i class="fas fa-list text-[9px]"></i>
										<span class="truncate">Factures {yr}</span>
									</a>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<a
			href={resolve('/app/training')}
			onclick={onNavigate}
			class="mb-2 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page.url.pathname.startsWith(
				'/app/training'
			)
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-dumbbell w-4 text-center text-xs"></i>
			Training
		</a>

		<div class="my-1 h-px bg-border/50"></div>

		<!-- Reminders (Single link, collapsible not needed) -->
		<a
			href={resolve('/app/reminders')}
			onclick={onNavigate}
			class="mt-2 mb-1 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page.url.pathname.startsWith(
				'/app/reminders'
			)
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-bell w-4 text-center text-xs"></i>
			Reminders
		</a>

		<div class="my-1 h-px bg-border/50"></div>

		<a
			href={resolve('/app/library')}
			onclick={onNavigate}
			class="mt-2 mb-1 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page
				.url.pathname === '/app/library'
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-cubes w-4 text-center text-xs"></i>
			Library
		</a>

		<a
			href={resolve('/app/tags')}
			onclick={onNavigate}
			class="mb-2 flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] transition-colors {page
				.url.pathname === '/app/tags'
				? 'bg-primary-subdued font-medium text-primary-text'
				: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
		>
			<i class="fas fa-tags w-4 text-center text-xs"></i>
			Tags
		</a>

		<div class="my-1 h-px bg-border/50"></div>

		{#each categories as cat (cat.id)}
			{@const isActive = isCategoryActive(cat)}
			{@const isExpanded = expandedCategories.has(cat.id)}

			<div class="flex items-center">
				<button
					type="button"
					aria-label="Toggle category"
					aria-expanded={isExpanded}
					class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleCategory(cat.id);
					}}
				>
					<i
						class="fas fa-chevron-right text-[9px] transition-transform duration-150 {isExpanded
							? 'rotate-90'
							: ''}"
					></i>
				</button>
				<a
					href={resolve('/app/category/[id]', { id: cat.id })}
					onclick={onNavigate}
					class="flex flex-1 items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors {isActive
						? 'text-fg-accent'
						: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
				>
					{#if cat.icon}
						<i
							class="fas {cat.icon} w-4 text-center text-xs"
							style="color: {cat.iconColor || 'var(--color-primary-text)'}"
						></i>
					{:else}
						<i class="fas fa-folder w-4 text-center text-xs text-fg-subdued"></i>
					{/if}
					<span class="flex-1 truncate text-[11px] font-bold tracking-wide uppercase"
						>{cat.name}</span
					>
				</a>
				<button
					type="button"
					class="mr-0.5 flex h-7 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
					title="Add Page"
					aria-label="Add Page"
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						creatingPageFor = creatingPageFor === cat.id ? null : cat.id;
						newPageName = '';
					}}
				>
					<i class="fas fa-plus text-[9px]"></i>
				</button>
				<div class="mr-0.5 flex h-7 w-6 shrink-0 items-center justify-center">
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
				<div class="mb-1 ml-7">
					{#if cat.pages && cat.pages.length > 0}
						{#each cat.pages as pg (pg.id)}
							<a
								href={resolve('/app/category/[id]/page/[pageId]', {
									id: cat.id,
									pageId: pg.id
								})}
								onclick={onNavigate}
								class="flex min-h-8 items-center gap-2 rounded-sm px-2.5 py-1.5 text-[13px] transition-colors {isPageActive(
									pg.id
								)
									? 'bg-primary-subdued font-medium text-primary-text'
									: 'text-fg-subdued hover:bg-muted hover:text-fg'}"
							>
								<i class="fas fa-file w-3 text-center text-[10px]"></i>
								<span class="truncate">{pg.name}</span>
							</a>
						{/each}
					{:else}
						<p class="px-2.5 py-1 text-[11px] text-fg-subdued italic">No pages</p>
					{/if}

					{#if creatingPageFor === cat.id}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								createPage(cat.id);
							}}
							class="flex items-center gap-1 px-1.5 py-1"
						>
							<Input size="sm" bind:value={newPageName} placeholder="Page name" class="flex-1" />
							<button
								type="submit"
								aria-label="Create page"
								class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-primary text-white hover:bg-primary-hover"
								><i class="fas fa-check text-[9px]"></i></button
							>
							<button
								type="button"
								aria-label="Cancel"
								class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg hover:bg-border"
								onclick={() => {
									creatingPageFor = null;
									newPageName = '';
								}}><i class="fas fa-times text-[9px]"></i></button
							>
						</form>
					{/if}
				</div>
			{/if}

			<div class="my-1 h-px bg-border/50"></div>
		{/each}

		<div class="mt-2 px-2">
			<a
				href={resolve('/app/category/new')}
				onclick={onNavigate}
				class="flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
			>
				<i class="fas fa-plus w-4 text-center text-xs"></i>
				Add Category
			</a>
		</div>
	</nav>

	<div class="relative border-t border-border p-3">
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-muted"
			onclick={() => (showUserMenu = !showUserMenu)}
		>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
			>
				{getUserInitial()}
			</div>
			<div class="flex-1 truncate text-left text-xs text-fg">{user?.name || 'User'}</div>
			<i class="fas fa-ellipsis-vertical text-[10px] text-fg-subdued"></i>
		</button>

		{#if showUserMenu}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute right-3 bottom-full left-3 mb-1 rounded-sm border border-border bg-surface shadow-lg"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="border-b border-border px-3 py-2">
					<p class="truncate text-xs font-medium text-fg">{user?.name}</p>
					<p class="truncate text-[10px] text-fg-subdued">{user?.email}</p>
				</div>
				<div class="py-1">
					<a
						href={resolve('/app/settings/profile')}
						onclick={() => {
							showUserMenu = false;
							onNavigate();
						}}
						class="flex items-center gap-2 px-3 py-2 text-xs text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					>
						<i class="fas fa-user-pen w-4 text-center text-[10px]"></i>
						Edit Profile
					</a>
					<Button variant="ghost" size="sm" class="w-full justify-start" onclick={handleLogout}>
						<i class="fas fa-right-from-bracket w-4 text-center text-[10px]"></i>
						Logout
					</Button>
				</div>
			</div>
		{/if}
	</div>
</aside>
