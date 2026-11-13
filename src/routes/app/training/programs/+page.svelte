<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { WEEKDAY_LABELS as DAY_LABELS } from '$lib/utils/format';
	import type { ProgramListItem } from '$lib/types';

	let { data } = $props();
	let programs = $derived<ProgramListItem[]>(data.programs ?? []);

	let dialogOpen = $state(false);
	let saving = $state(false);
	let formName = $state('');
	let formDescription = $state('');

	function openCreate() {
		formName = '';
		formDescription = '';
		dialogOpen = true;
	}

	async function create() {
		if (saving || !formName.trim()) return;
		saving = true;
		const res = await fetch('/api/programs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'createProgram',
				name: formName.trim(),
				description: formDescription.trim() || undefined
			})
		});
		saving = false;
		const body = await res.json().catch(() => null);
		if (!res.ok || !body?.id) return;
		dialogOpen = false;
		showToast('Program created');
		await goto(resolve('/app/training/programs/[id]', { id: body.id }));
	}

	async function toggleActive(p: ProgramListItem, active: boolean) {
		const res = await fetch('/api/programs', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateProgram', id: p.id, active })
		});
		if (res.ok) await invalidateAll();
	}

	async function remove(p: ProgramListItem) {
		if (!(await confirmAction(`Delete "${p.name}" and all its blocks?`))) return;
		const res = await fetch(`/api/programs?type=program&id=${encodeURIComponent(p.id)}`, {
			method: 'DELETE'
		});
		if (!res.ok) return;
		showToast('Program deleted');
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Training Programs - MegaOrganize</title>
</svelte:head>

<div class="px-3.5 py-4 pb-24 sm:p-8 sm:pb-8">
	<PageHeader title="Training Programs" subtitle="Weekly plans with exercises, sets and reps">
		<Button href={resolve('/app/training')} variant="secondary" size="sm">
			<i class="fas fa-arrow-left mr-1.5 text-xs sm:mr-2"></i>
			Training
		</Button>
		<Button variant="primary" size="sm" onclick={openCreate}>
			<i class="fas fa-plus mr-1.5 text-xs sm:mr-2"></i>
			Program
		</Button>
	</PageHeader>

	{#if programs.length === 0}
		<EmptyState
			icon="fa-calendar-days"
			message="No programs yet"
			submessage="Create a program to plan your training week"
		>
			<Button variant="primary" onclick={openCreate} class="mt-4">
				<i class="fas fa-plus mr-2 text-xs"></i>
				New program
			</Button>
		</EmptyState>
	{:else}
		<div class="space-y-2">
			{#each programs as p (p.id)}
				<div
					class="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary-text/50"
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"
					>
						<i class="fas fa-calendar-days text-sm"></i>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-fg">{p.name}</p>
						<p class="text-[10px] text-fg-subdued">
							{p.blockCount} block{p.blockCount !== 1 ? 's' : ''}
							· {p.exerciseCount} exercise{p.exerciseCount !== 1 ? 's' : ''}
							{#if p.weekdays.length > 0}
								· {p.weekdays.map((w) => DAY_LABELS[w]).join(', ')}
							{/if}
						</p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each p.weekdays as w (w)}
								<Badge size="sm" variant={p.active ? 'primary' : 'default'}>{DAY_LABELS[w]}</Badge>
							{/each}
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<Switch
							checked={p.active}
							label="On calendar"
							onchange={(checked) => toggleActive(p, checked)}
						/>
						<Button
							href={resolve('/app/training/programs/[id]', { id: p.id })}
							size="sm"
							variant="secondary"
						>
							<i class="fas fa-pen mr-1.5 text-[10px]"></i>
							Open
						</Button>
						<button
							type="button"
							class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-error/10 hover:text-error-text"
							onclick={() => remove(p)}
							title="Delete"
							aria-label="Delete"
						>
							<i class="fas fa-trash text-[10px]"></i>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog bind:open={dialogOpen} title="New program">
	<div class="space-y-4">
		<Input label="Name" bind:value={formName} placeholder="e.g. Upper / Lower Split" />
		<Textarea
			label="Description"
			bind:value={formDescription}
			rows={3}
			placeholder="Goals, notes, cycle length..."
		/>
	</div>
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (dialogOpen = false)}>Cancel</Button>
		<Button loading={saving} disabled={!formName.trim()} onclick={create}>Create</Button>
	{/snippet}
</Dialog>
