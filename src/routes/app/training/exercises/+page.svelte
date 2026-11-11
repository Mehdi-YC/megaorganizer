<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import type { Exercise, MuscleGroup, PersonalRecord } from '$lib/types';

	type ExerciseWithPr = Exercise & { pr: PersonalRecord | null };

	const GROUP_LABELS: Record<MuscleGroup, string> = {
		chest: 'Chest',
		back: 'Back',
		shoulders: 'Shoulders',
		biceps: 'Biceps',
		triceps: 'Triceps',
		forearms: 'Forearms',
		abs: 'Abs',
		glutes: 'Glutes',
		quadriceps: 'Quadriceps',
		hamstrings: 'Hamstrings',
		calves: 'Calves',
		full_body: 'Full body',
		cardio: 'Cardio',
		other: 'Other'
	};

	let { data } = $props();
	let exercises = $derived<ExerciseWithPr[]>(data.exercises ?? []);

	let search = $state('');
	let selectedGroup = $state<MuscleGroup | 'all'>('all');

	let filtered = $derived(
		exercises.filter((e) => {
			if (selectedGroup !== 'all' && e.muscleGroup !== selectedGroup) return false;
			if (search.trim() && !e.name.toLowerCase().includes(search.trim().toLowerCase()))
				return false;
			return true;
		})
	);

	// ── Create / edit dialog ────────────────────────────────────────────────
	let dialogOpen = $state(false);
	let editing = $state<ExerciseWithPr | null>(null);
	let saving = $state(false);
	let formName = $state('');
	let formGroup = $state<MuscleGroup>('other');
	let formEquipment = $state('');
	let formDescription = $state('');
	let formImageUrls = $state('');
	let uploadBusy = $state(false);
	let previewSrc = $state('');

	function openCreate() {
		editing = null;
		formName = '';
		formGroup = 'other';
		formEquipment = '';
		formDescription = '';
		formImageUrls = '';
		previewSrc = '';
		dialogOpen = true;
	}

	function openDetail(exercise: ExerciseWithPr) {
		editing = exercise;
		formName = exercise.name;
		formGroup = exercise.muscleGroup;
		formEquipment = exercise.equipment ?? '';
		formDescription = exercise.description ?? '';
		formImageUrls = exercise.images.filter((src) => !src.startsWith('/api/')).join('\n');
		previewSrc = exercise.images[0] ?? '';
		dialogOpen = true;
	}

	async function save() {
		if (saving || !formName.trim()) return;
		saving = true;
		const payload = {
			name: formName.trim(),
			muscleGroup: formGroup,
			equipment: formEquipment.trim(),
			description: formDescription.trim(),
			imageUrls: formImageUrls
				.split('\n')
				.map((s) => s.trim())
				.filter(Boolean)
		};
		const res = await fetch('/api/exercises', {
			method: editing ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload)
		});
		saving = false;
		if (!res.ok) return;
		dialogOpen = false;
		showToast(editing ? 'Exercise updated' : 'Exercise created');
		await invalidateAll();
	}

	async function remove() {
		if (!editing) return;
		if (!(await confirmAction('Delete this exercise? It is removed from programs using it.')))
			return;
		const res = await fetch(`/api/exercises?id=${encodeURIComponent(editing.id)}`, {
			method: 'DELETE'
		});
		if (!res.ok) return;
		dialogOpen = false;
		showToast('Exercise deleted');
		await invalidateAll();
	}

	async function uploadImage(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !editing) return;
		uploadBusy = true;
		const formData = new FormData();
		formData.append('id', editing.id);
		formData.append('file', file);
		const res = await fetch('/api/exercises/image', { method: 'POST', body: formData });
		uploadBusy = false;
		input.value = '';
		if (!res.ok) return;
		const body = await res.json();
		editing = { ...editing, images: body.images ?? editing.images };
		previewSrc = editing.images[editing.images.length - 1] ?? previewSrc;
		showToast('Image uploaded');
		await invalidateAll();
	}

	async function removeImage(src: string) {
		if (!editing || !src.startsWith('/api/')) return;
		if (!(await confirmAction('Remove this image?'))) return;
		const url = new URL(src, window.location.origin);
		const name = url.searchParams.get('name');
		if (!name) return;
		const res = await fetch(
			`/api/exercises/image?id=${encodeURIComponent(editing.id)}&name=${encodeURIComponent(name)}`,
			{ method: 'DELETE' }
		);
		if (!res.ok) return;
		const images = editing.images.filter((s) => s !== src);
		editing = { ...editing, images };
		previewSrc = images[0] ?? '';
		await invalidateAll();
	}

	function formatPr(pr: PersonalRecord | null): string | null {
		if (!pr || (pr.maxWeight === null && pr.maxReps === null)) return null;
		if (pr.maxWeight !== null) {
			return `PR ${pr.maxReps ?? '–'} × ${pr.maxWeight} ${pr.unit ?? 'kg'}`;
		}
		return `PR ${pr.maxReps} reps`;
	}
</script>

<svelte:head>
	<title>Exercise Library - MegaOrganize</title>
</svelte:head>

<div class="px-3.5 py-4 pb-24 sm:p-8 sm:pb-8">
	<PageHeader title="Exercise Library" subtitle="Built-in exercises with pictures, plus your own">
		<Button href="/app/training" variant="secondary" size="sm">
			<i class="fas fa-arrow-left mr-1.5 text-xs sm:mr-2"></i>
			Training
		</Button>
		<Button variant="primary" size="sm" onclick={openCreate}>
			<i class="fas fa-plus mr-1.5 text-xs sm:mr-2"></i>
			Exercise
		</Button>
	</PageHeader>

	<div class="mb-4 flex flex-wrap items-center gap-2">
		<SearchInput bind:value={search} placeholder="Search exercises..." class="max-w-xs flex-1" />
	</div>

	<div
		class="no-scrollbar mb-6 flex max-w-full items-center gap-2 overflow-x-auto py-0.5 sm:flex-wrap"
	>
		<button
			type="button"
			class="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {selectedGroup ===
			'all'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (selectedGroup = 'all')}
		>
			All
		</button>
		{#each Object.entries(GROUP_LABELS) as [key, label] (key)}
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {selectedGroup ===
				key
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (selectedGroup = key as MuscleGroup)}
			>
				{label}
			</button>
		{/each}
	</div>

	{#if filtered.length === 0}
		<EmptyState
			icon="fa-dumbbell"
			message="No exercises found"
			submessage="Adjust the filters or add your own exercise"
		/>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
			{#each filtered as exercise (exercise.id)}
				<button
					type="button"
					class="cursor-pointer overflow-hidden rounded-sm border border-border bg-surface text-left transition-colors hover:border-primary-text/50"
					onclick={() => openDetail(exercise)}
				>
					<div class="aspect-[3/2] w-full overflow-hidden bg-muted">
						{#if exercise.images[0]}
							<img
								src={exercise.images[0]}
								alt={exercise.name}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						{:else}
							<div class="flex h-full w-full items-center justify-center">
								<i class="fas fa-dumbbell text-2xl text-fg-subdued"></i>
							</div>
						{/if}
					</div>
					<div class="p-3">
						<p class="truncate text-sm font-medium text-fg">{exercise.name}</p>
						<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
							<Badge size="sm">{GROUP_LABELS[exercise.muscleGroup]}</Badge>
							{#if formatPr(exercise.pr)}
								<Badge size="sm" variant="success">{formatPr(exercise.pr)}</Badge>
							{/if}
						</div>
						{#if exercise.equipment}
							<p class="mt-1 truncate text-xs text-fg-subdued">{exercise.equipment}</p>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<Dialog bind:open={dialogOpen} title={editing ? editing.name : 'New exercise'}>
	{#if editing?.isBuiltIn}
		<div class="space-y-4">
			{#if previewSrc}
				<img src={previewSrc} alt={editing.name} class="w-full rounded-sm border border-border" />
			{/if}
			{#if editing.images.length > 1}
				<div class="flex gap-2">
					{#each editing.images as src (src)}
						<button type="button" class="cursor-pointer" onclick={() => (previewSrc = src)}>
							<img
								{src}
								alt="Thumbnail"
								class="h-14 w-20 rounded-sm border border-border object-cover {previewSrc === src
									? 'ring-2 ring-primary'
									: ''}"
							/>
						</button>
					{/each}
				</div>
			{/if}
			<div class="flex flex-wrap gap-1.5">
				<Badge size="sm">{GROUP_LABELS[editing.muscleGroup]}</Badge>
				{#if editing.equipment}<Badge size="sm" variant="outline">{editing.equipment}</Badge>{/if}
				{#each editing.secondaryMuscles as m (m)}
					<Badge size="sm" variant="outline">{GROUP_LABELS[m as MuscleGroup] ?? m}</Badge>
				{/each}
				{#if formatPr(editing.pr)}
					<Badge size="sm" variant="success">{formatPr(editing.pr)}</Badge>
				{/if}
			</div>
			{#if editing.description}
				<p class="text-sm leading-relaxed text-fg-subdued">{editing.description}</p>
			{/if}
			<p class="text-xs text-fg-subdued">
				<i class="fas fa-circle-info mr-1"></i>
				Built-in exercises are shared. Add your own exercise to customize it.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#if editing}
				<div>
					<p class="mb-1.5 text-xs font-medium text-fg-subdued">Images</p>
					{#if previewSrc}
						<img
							src={previewSrc}
							alt="Preview"
							class="mb-2 w-full rounded-sm border border-border"
						/>
					{/if}
					<div class="flex flex-wrap gap-2">
						{#each editing.images as src (src)}
							<div class="relative">
								<button type="button" class="cursor-pointer" onclick={() => (previewSrc = src)}>
									<img
										{src}
										alt="Thumbnail"
										class="h-14 w-20 rounded-sm border border-border object-cover {previewSrc ===
										src
											? 'ring-2 ring-primary'
											: ''}"
									/>
								</button>
								{#if src.startsWith('/api/')}
									<button
										type="button"
										class="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-error text-[10px] text-white"
										aria-label="Remove image"
										onclick={() => removeImage(src)}
									>
										<i class="fas fa-xmark"></i>
									</button>
								{/if}
							</div>
						{/each}
						<label
							class="flex h-14 w-20 cursor-pointer items-center justify-center rounded-sm border border-dashed border-border text-fg-subdued transition-colors hover:border-primary-text/50"
						>
							<i class="fas {uploadBusy ? 'fa-spinner fa-spin' : 'fa-camera'}"></i>
							<input type="file" accept="image/*" class="hidden" onchange={uploadImage} />
						</label>
					</div>
					<p class="mt-1 text-xs text-fg-subdued">Upload a picture, or paste image URLs below.</p>
				</div>
			{/if}

			<Input label="Name" bind:value={formName} placeholder="e.g. Incline Dumbbell Press" />
			<div class="grid grid-cols-2 gap-3">
				<Select label="Muscle group" bind:value={formGroup}>
					{#each Object.entries(GROUP_LABELS) as [key, label] (key)}
						<option value={key}>{label}</option>
					{/each}
				</Select>
				<Input label="Equipment" bind:value={formEquipment} placeholder="e.g. dumbbell" />
			</div>
			<Textarea
				label="Description"
				bind:value={formDescription}
				rows={3}
				placeholder="How to perform it, cues, variations..."
			/>
			<Textarea
				label="Image URLs (one per line)"
				bind:value={formImageUrls}
				rows={2}
				placeholder="https://..."
			/>
		</div>
	{/if}

	{#snippet footer()}
		{#if editing?.isBuiltIn}
			<Button variant="secondary" onclick={() => (dialogOpen = false)}>Close</Button>
		{:else}
			<div class="flex w-full items-center justify-between gap-2">
				{#if editing}
					<Button variant="danger" onclick={remove}>
						<i class="fas fa-trash mr-1.5 text-xs"></i>
						Delete
					</Button>
				{:else}
					<span></span>
				{/if}
				<div class="flex gap-2">
					<Button variant="secondary" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button loading={saving} disabled={!formName.trim()} onclick={save}>Save</Button>
				</div>
			</div>
		{/if}
	{/snippet}
</Dialog>
