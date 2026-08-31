<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	let category = $state(data.category);
	let pages = $state(data.pages ?? []);
	let showNewPage = $state(false);
	let newPageName = $state('');
	let dragIdx = $state<number | null>(null);

	async function createPage() {
		if (!newPageName.trim() || !category) return;
		const response = await fetch('/api/pages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: category.id, name: newPageName })
		});
		if (response.ok) {
			const pg = await response.json();
			pages = [...pages, pg];
			newPageName = '';
			showNewPage = false;
		}
	}

	async function persistPageReorder(fromIdx: number, toIdx: number) {
		const moved = pages[fromIdx];
		const target = pages[toIdx];
		if (!moved || !target) return;
		await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: moved.id, position: toIdx })
		});
		await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: target.id, position: fromIdx })
		});
	}

	function handleDragStart(e: DragEvent, idx: number) {
		dragIdx = idx;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(idx));
		}
	}

	function handleDragOver(e: DragEvent, idx: number) {
		e.preventDefault();
		if (dragIdx === null || dragIdx === idx) return;
		const next = [...pages];
		const [moved] = next.splice(dragIdx, 1);
		next.splice(idx, 0, moved);
		pages = next;
		persistPageReorder(dragIdx, idx);
		dragIdx = idx;
	}

	function handleDragEnd() {
		dragIdx = null;
	}
</script>

<svelte:head>
	<title>{category?.name || 'Category'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	{#if !category}
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-exclamation-triangle mb-4 text-4xl text-fg-subdued"></i>
			<p class="text-fg-subdued">Category not found</p>
			<a href="/app" class="mt-4 text-primary hover:text-primary-hover">Back to Dashboard</a>
		</div>
	{:else}
		<div class="mb-6 sm:mb-8">
			<div class="flex items-center gap-3 mb-2">
				{#if category.icon}
					<i class="fas {category.icon} text-2xl" style="color: {category.iconColor || 'var(--color-primary)'}"></i>
				{/if}
				<h1 class="text-lg font-semibold text-fg-accent">{category.name}</h1>
			</div>
			{#if category.description}
				<p class="mt-2 text-fg-subdued">{category.description}</p>
			{/if}
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Pages</h2>
			<button type="button" class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover" onclick={() => (showNewPage = true)}>
				<i class="fas fa-plus mr-2"></i> New Page
			</button>
		</div>

		{#if showNewPage}
			<div class="mb-6 rounded-sm border border-border bg-surface p-4">
				<form onsubmit={(e) => { e.preventDefault(); createPage(); }} class="flex flex-col sm:flex-row gap-2">
					<input type="text" bind:value={newPageName} placeholder="Page name" class="flex-1 h-[36px] rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors focus:border-primary focus:outline-none focus:ring-0" autofocus />
					<div class="flex gap-2">
						<button type="submit" class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover">Create</button>
						<button type="button" class="inline-flex h-[36px] items-center justify-center rounded-sm border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-muted" onclick={() => { showNewPage = false; newPageName = ''; }}>Cancel</button>
					</div>
				</form>
			</div>
		{/if}

		{#if pages.length === 0}
			<div class="rounded-sm border border-border bg-surface py-16 text-center">
				<i class="fas fa-file-alt mb-4 text-4xl text-fg-subdued"></i>
				<p class="text-fg-subdued">No pages yet</p>
				<p class="mt-1 text-sm text-fg-subdued">Create your first page to get started</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each pages as pg, idx}
					<a
						href="/app/category/{category.id}/page/{pg.id}"
						class="group relative rounded-sm border border-border bg-surface p-6 transition-all hover:border-primary cursor-move"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, idx)}
						ondragover={(e) => handleDragOver(e, idx)}
						ondragend={handleDragEnd}
						role="listitem"
					>
						<div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<i class="fas fa-grip-vertical text-[10px] text-fg-subdued/40"></i>
						</div>
						<div class="mb-3 flex items-center gap-2">
							{#if pg.icon}
								<i class="fas {pg.icon}" style="color: {pg.iconColor || 'inherit'}"></i>
							{:else}
								<i class="fas fa-file text-primary"></i>
							{/if}
							<h3 class="font-medium text-fg group-hover:text-primary">{pg.name}</h3>
						</div>
						{#if pg.description}
							<p class="text-sm text-fg-subdued line-clamp-2">{pg.description}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
