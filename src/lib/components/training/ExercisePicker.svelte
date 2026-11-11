<script lang="ts">
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { MUSCLE_GROUP_LABELS, formatPr } from '$lib/utils/training';
	import type { Exercise, MuscleGroup, PersonalRecord } from '$lib/types';

	let {
		open = $bindable(false),
		exercises,
		onadd
	}: {
		open?: boolean;
		exercises: Array<Exercise & { pr: PersonalRecord | null }>;
		onadd: (selected: Array<Exercise & { pr: PersonalRecord | null }>) => void;
	} = $props();

	let search = $state('');
	let group = $state<MuscleGroup | 'all'>('all');
	let selection = $state<Array<Exercise & { pr: PersonalRecord | null }>>([]);

	let list = $derived(
		exercises.filter((e) => {
			if (group !== 'all' && e.muscleGroup !== group) return false;
			if (search.trim() && !e.name.toLowerCase().includes(search.trim().toLowerCase()))
				return false;
			return true;
		})
	);

	function toggle(exercise: Exercise & { pr: PersonalRecord | null }) {
		selection = selection.some((e) => e.id === exercise.id)
			? selection.filter((e) => e.id !== exercise.id)
			: [...selection, exercise];
	}

	function addSelected() {
		if (selection.length === 0) return;
		onadd(selection);
		selection = [];
		open = false;
	}
</script>

<Dialog bind:open title="Choose an exercise">
	<div class="space-y-3">
		<SearchInput bind:value={search} placeholder="Search the library..." />
		<div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
			<button
				type="button"
				class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {group ===
				'all'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (group = 'all')}
			>
				All
			</button>
			{#each Object.entries(MUSCLE_GROUP_LABELS) as [key, label] (key)}
				<button
					type="button"
					class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {group ===
					key
						? 'bg-primary text-white'
						: 'bg-muted text-fg hover:bg-border'}"
					onclick={() => (group = key as MuscleGroup)}
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="max-h-80 space-y-1 overflow-y-auto">
			{#each list as exercise (exercise.id)}
				{@const selected = selection.some((e) => e.id === exercise.id)}
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 rounded-sm border p-2 text-left transition-colors {selected
						? 'border-primary bg-primary/5'
						: 'border-transparent hover:bg-muted'}"
					onclick={() => toggle(exercise)}
				>
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border {selected
							? 'border-primary bg-primary text-white'
							: 'border-border-strong'}"
					>
						{#if selected}<i class="fas fa-check text-[9px]"></i>{/if}
					</div>
					<div class="h-10 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
						{#if exercise.images[0]}
							<img
								src={exercise.images[0]}
								alt={exercise.name}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm text-fg">{exercise.name}</p>
						<p class="text-xs text-fg-subdued">
							{MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup}
							{#if exercise.equipment}· {exercise.equipment}{/if}
						</p>
					</div>
					{#if formatPr(exercise.pr)}
						<Badge size="sm" variant="success">{formatPr(exercise.pr)}</Badge>
					{/if}
				</button>
			{:else}
				<p class="py-6 text-center text-sm text-fg-subdued">No exercises match</p>
			{/each}
		</div>
	</div>
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		<Button disabled={selection.length === 0} onclick={addSelected}>
			Add {selection.length} exercise{selection.length === 1 ? '' : 's'}
		</Button>
	{/snippet}
</Dialog>
