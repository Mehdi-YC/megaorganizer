<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let category = $state(data.category);
	// svelte-ignore state_referenced_locally
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
		<EmptyState icon="fa-exclamation-triangle" message="Category not found">
			<Button href="/app" variant="primary" size="sm">Back to Dashboard</Button>
		</EmptyState>
	{:else}
		<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
			<div class="flex min-w-0 items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
					{#if category.icon}
						<i
							class="fas {category.icon} text-lg"
							style="color: {category.iconColor || 'var(--color-primary)'}"
						></i>
					{:else}
						<i class="fas fa-folder text-lg text-primary"></i>
					{/if}
				</div>
				<div class="min-w-0">
					<h1 class="truncate text-xl font-bold text-fg-accent">{category.name}</h1>
					{#if category.description}
						<p class="truncate text-sm text-fg-subdued">{category.description}</p>
					{/if}
				</div>
			</div>
			<Button size="sm" onclick={() => (showNewPage = true)}>
				<i class="fas fa-plus mr-2 text-xs"></i> New Page
			</Button>
		</div>

		<h2 class="mb-3 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
			Pages ({pages.length})
		</h2>

		{#if showNewPage}
			<div class="mb-6 rounded-sm border border-border bg-surface p-4">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						createPage();
					}}
					class="flex flex-col gap-2 sm:flex-row"
				>
					<Input class="flex-1" bind:value={newPageName} placeholder="Page name" />
					<div class="flex gap-2">
						<Button type="submit">Create</Button>
						<Button
							type="button"
							variant="secondary"
							onclick={() => {
								showNewPage = false;
								newPageName = '';
							}}>Cancel</Button
						>
					</div>
				</form>
			</div>
		{/if}

		{#if pages.length === 0}
			<EmptyState
				icon="fa-file-alt"
				message="No pages yet"
				submessage="Create your first page to get started"
			/>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each pages as pg, idx (pg.id)}
					<a
						href="/app/category/{category.id}/page/{pg.id}"
						class="group relative flex cursor-move items-start gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, idx)}
						ondragover={(e) => handleDragOver(e, idx)}
						ondragend={handleDragEnd}
					>
						<div
							class="absolute top-2 right-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
						>
							<i class="fas fa-grip-vertical text-[10px] text-fg-subdued/40"></i>
						</div>
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10">
							{#if pg.icon}
								<i
									class="fas {pg.icon} text-sm"
									style="color: {pg.iconColor || 'var(--color-primary)'}"
								></i>
							{:else}
								<i class="fas fa-file text-sm text-primary"></i>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="truncate text-sm font-medium text-fg group-hover:text-primary">
								{pg.name}
							</h3>
							{#if pg.description}
								<p class="mt-0.5 line-clamp-2 text-xs text-fg-subdued">{pg.description}</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
