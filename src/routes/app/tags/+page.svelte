<script lang="ts">
	import { onMount } from 'svelte';

	let tags = $state<any[]>([]);
	let loading = $state(true);
	let showNew = $state(false);
	let newName = $state('');
	let newColor = $state('#5A31F4');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('');

	const presets = [
		'#5A31F4', '#DC2626', '#F97316', '#EAB308', '#22C55E',
		'#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
	];

	onMount(async () => {
		const res = await fetch('/api/tags');
		if (res.ok) tags = await res.json();
		loading = false;
	});

	async function create() {
		if (!newName.trim()) return;
		const res = await fetch('/api/tags', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName.trim(), color: newColor })
		});
		if (res.ok) {
			const t = await res.json();
			tags = [...tags, t];
			newName = '';
			newColor = '#5A31F4';
			showNew = false;
		}
	}

	async function update(id: string) {
		if (!editName.trim()) return;
		const res = await fetch('/api/tags', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, name: editName.trim(), color: editColor })
		});
		if (res.ok) {
			const updated = await res.json();
			tags = tags.map((t) => t.id === id ? updated : t);
			editingId = null;
		}
	}

	async function remove(id: string) {
		if (!confirm('Delete this tag?')) return;
		const res = await fetch('/api/tags', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		if (res.ok) tags = tags.filter((t) => t.id !== id);
	}

	function startEdit(t: any) {
		editingId = t.id;
		editName = t.name;
		editColor = t.color || '#5A31F4';
	}
</script>

<svelte:head><title>Tags - MegaOrganize</title></svelte:head>

<div class="p-4 sm:p-6">
	<div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold text-fg-accent">Tags</h1>
			<p class="mt-1 text-sm text-fg-subdued">{tags.length} tags</p>
		</div>
		<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover" onclick={() => (showNew = true)}>
			<i class="fas fa-plus text-xs"></i> New Tag
		</button>
	</div>

	{#if showNew}
		<div class="mb-4 rounded-sm border border-border bg-surface p-3 sm:p-4">
			<div class="flex flex-col gap-3">
				<div class="flex flex-col sm:flex-row gap-2">
					<input type="text" bind:value={newName} placeholder="Tag name" class="flex-1 h-9 rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" autofocus onkeydown={(e) => { if (e.key === 'Enter') create(); }} />
					<div class="flex gap-2">
						<button type="button" class="h-9 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={create}>Create</button>
						<button type="button" class="h-9 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => { showNew = false; newName = ''; }}>Cancel</button>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-fg-subdued">Color:</span>
					{#each presets as c}
						<button type="button" class="h-5 w-5 rounded-sm border-2 transition-all {newColor === c ? 'border-fg scale-110' : 'border-transparent hover:border-fg-subdued'}" style="background: {c}" onclick={() => (newColor = c)}></button>
					{/each}
					<input type="color" bind:value={newColor} class="h-5 w-8 cursor-pointer rounded-sm border-0 bg-transparent" />
				</div>
				<div class="flex items-center gap-2">
					<div class="rounded-sm px-2 py-1 text-xs font-medium text-white" style="background: {newColor}">{newName || 'Preview'}</div>
				</div>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-16"><div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
	{:else if tags.length === 0}
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-tags mb-3 text-3xl text-fg-subdued"></i>
			<p class="text-sm text-fg-subdued">No tags yet</p>
		</div>
	{:else}
		<div class="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			{#each tags as t}
				<div class="group flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3 transition-all hover:border-primary/50">
					{#if editingId === t.id}
						<div class="flex w-full flex-col gap-2">
							<input type="text" bind:value={editName} class="h-8 w-full rounded-sm border border-border bg-bg px-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-0" onkeydown={(e) => { if (e.key === 'Enter') update(t.id); if (e.key === 'Escape') editingId = null; }} />
							<div class="flex items-center gap-2">
								{#each presets as c}
									<button type="button" class="h-4 w-4 rounded-sm border transition-all {editColor === c ? 'border-fg scale-110' : 'border-transparent'}" style="background: {c}" onclick={() => (editColor = c)}></button>
								{/each}
								<input type="color" bind:value={editColor} class="h-4 w-6 cursor-pointer rounded-sm border-0 bg-transparent" />
							</div>
							<div class="flex gap-1.5">
								<button type="button" class="h-7 rounded-sm bg-primary px-2.5 text-[11px] text-white hover:bg-primary-hover" onclick={() => update(t.id)}>Save</button>
								<button type="button" class="h-7 rounded-sm bg-muted px-2.5 text-[11px] text-fg hover:bg-border" onclick={() => (editingId = null)}>Cancel</button>
							</div>
						</div>
					{:else}
						<div class="h-4 w-4 shrink-0 rounded-full" style="background: {t.color || '#5A31F4'}"></div>
						<span class="flex-1 text-sm font-medium text-fg">{t.name}</span>
						<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button type="button" class="h-6 w-6 items-center justify-center rounded-sm text-fg-subdued hover:text-fg hover:bg-muted" onclick={() => startEdit(t)}><i class="fas fa-pen text-[9px]"></i></button>
							<button type="button" class="h-6 w-6 items-center justify-center rounded-sm text-fg-subdued hover:text-error hover:bg-error/10" onclick={() => remove(t.id)}><i class="fas fa-trash text-[9px]"></i></button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
