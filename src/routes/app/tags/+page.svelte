<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	let tags = $state<any[]>([]);
	let loading = $state(true);
	let showNew = $state(false);
	let newName = $state('');
	let newColor = $state('#5A31F4');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('');

	const presets = [
		'#5A31F4',
		'#DC2626',
		'#F97316',
		'#EAB308',
		'#22C55E',
		'#06B6D4',
		'#3B82F6',
		'#8B5CF6',
		'#EC4899',
		'#6B7280'
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
			tags = tags.map((t) => (t.id === id ? updated : t));
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
	<PageHeader title="Tags" subtitle="{tags.length} tags">
		<Button size="md" onclick={() => (showNew = true)}>
			<i class="fas fa-plus text-xs"></i> New Tag
		</Button>
	</PageHeader>

	{#if showNew}
		<div class="mb-4 rounded-sm border border-border bg-surface p-3 sm:p-4">
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<Input
						class="flex-1"
						bind:value={newName}
						placeholder="Tag name"
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter') create();
						}}
					/>
					<div class="flex gap-2">
						<Button size="md" onclick={create}>Create</Button>
						<Button
							size="md"
							variant="secondary"
							onclick={() => {
								showNew = false;
								newName = '';
							}}>Cancel</Button
						>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-fg-subdued">Color:</span>
					{#each presets as c, i (c)}
						<button
							type="button"
							aria-label="Color {i + 1}"
							class="h-5 w-5 cursor-pointer rounded-sm border-2 transition-all {newColor === c
								? 'scale-110 border-fg'
								: 'border-transparent hover:border-fg-subdued'}"
							style="background: {c}"
							onclick={() => (newColor = c)}
						></button>
					{/each}
					<input
						type="color"
						bind:value={newColor}
						class="h-5 w-8 cursor-pointer rounded-sm border-0 bg-transparent"
					/>
				</div>
				<div class="flex items-center gap-2">
					<div
						class="rounded-sm px-2 py-1 text-xs font-medium text-white"
						style="background: {newColor}"
					>
						{newName || 'Preview'}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-16"><Spinner size="md" /></div>
	{:else if tags.length === 0}
		<EmptyState icon="fa-tags" message="No tags yet" />
	{:else}
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			{#each tags as t (t.id)}
				<div
					class="group flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3 transition-all hover:border-primary/50"
				>
					{#if editingId === t.id}
						<div class="flex w-full flex-col gap-2">
							<Input
								size="sm"
								bind:value={editName}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter') update(t.id);
									if (e.key === 'Escape') editingId = null;
								}}
							/>
							<div class="flex items-center gap-2">
								{#each presets as c, i (c)}
									<button
										type="button"
										aria-label="Color {i + 1}"
										class="h-4 w-4 cursor-pointer rounded-sm border transition-all {editColor === c
											? 'scale-110 border-fg'
											: 'border-transparent'}"
										style="background: {c}"
										onclick={() => (editColor = c)}
									></button>
								{/each}
								<input
									type="color"
									bind:value={editColor}
									class="h-4 w-6 cursor-pointer rounded-sm border-0 bg-transparent"
								/>
							</div>
							<div class="flex gap-1.5">
								<Button size="sm" onclick={() => update(t.id)}>Save</Button>
								<Button size="sm" variant="secondary" onclick={() => (editingId = null)}
									>Cancel</Button
								>
							</div>
						</div>
					{:else}
						<div
							class="h-4 w-4 shrink-0 rounded-full"
							style="background: {t.color || '#5A31F4'}"
						></div>
						<span class="flex-1 text-sm font-medium text-fg">{t.name}</span>
						<div class="flex gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
							<button
								type="button"
								aria-label="Edit"
								class="h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
								onclick={() => startEdit(t)}><i class="fas fa-pen text-[9px]"></i></button
							>
							<button
								type="button"
								aria-label="Delete"
								class="h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-error/10 hover:text-error"
								onclick={() => remove(t.id)}><i class="fas fa-trash text-[9px]"></i></button
							>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
