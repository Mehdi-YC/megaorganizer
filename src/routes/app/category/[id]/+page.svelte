<script lang="ts">
	import {} from '$app/navigation';
	import {} from '$app/state';
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
		<div class="mb-6 sm:mb-8">
			<div class="mb-2 flex items-center gap-3">
				{#if category.icon}
					<i
						class="fas {category.icon} text-2xl"
						style="color: {category.iconColor || 'var(--color-primary)'}"
					></i>
				{/if}
				<h1 class="text-lg font-semibold text-fg-accent">{category.name}</h1>
			</div>
			{#if category.description}
				<p class="mt-2 text-fg-subdued">{category.description}</p>
			{/if}
		</div>

		<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Pages</h2>
			<Button onclick={() => (showNewPage = true)}>
				<i class="fas fa-plus mr-2"></i> New Page
			</Button>
		</div>

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
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each pages as pg, idx (pg.id)}
					<a
						href="/app/category/{category.id}/page/{pg.id}"
						class="group relative cursor-move rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, idx)}
						ondragover={(e) => handleDragOver(e, idx)}
						ondragend={handleDragEnd}
					>
						<div
							class="absolute top-2 left-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
						>
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
							<p class="line-clamp-2 text-sm text-fg-subdued">{pg.description}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
