<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { MUSCLE_GROUP_LABELS as GROUP_LABELS } from '$lib/utils/training';
	import { untrack } from 'svelte';
	import type {
		Program,
		ProgramBlock,
		ProgramEntry,
		Exercise,
		PersonalRecord,
		MuscleGroup
	} from '$lib/types';

	const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	/** Editable copies with string fields, so inputs bind cleanly. */
	type EntryDraft = Omit<ProgramEntry, 'title' | 'sets' | 'reps' | 'weight' | 'unit' | 'notes'> & {
		title: string;
		sets: string;
		reps: string;
		weight: string;
		unit: string;
		notes: string;
	};
	type BlockDraft = Omit<ProgramBlock, 'entries'> & { entries: EntryDraft[] };
	type ProgramDraft = Omit<Program, 'description' | 'blocks'> & { description: string };

	function toEntryDraft(e: ProgramEntry): EntryDraft {
		return {
			...e,
			title: e.title ?? '',
			sets: e.sets !== null ? String(e.sets) : '',
			reps: e.reps ?? '',
			weight: e.weight !== null ? String(e.weight) : '',
			unit: e.unit ?? 'kg',
			notes: e.notes ?? ''
		};
	}

	function toBlockDraft(b: ProgramBlock): BlockDraft {
		return { ...b, entries: b.entries.map(toEntryDraft) };
	}

	function toProgramDraft(p: Program): ProgramDraft {
		return { ...p, description: p.description ?? '' };
	}

	let { data } = $props();

	let program = $state<ProgramDraft>(untrack(() => toProgramDraft(data.program as Program)));
	let blocks = $state<BlockDraft[]>(
		untrack(() => (data.program as Program).blocks.map(toBlockDraft))
	);
	$effect(() => {
		// invalidateAll() replaces load data; adopt the fresh copy.
		const fresh = data.program as Program;
		program = toProgramDraft(fresh);
		blocks = fresh.blocks.map(toBlockDraft);
	});

	let exercises = $derived<(Exercise & { pr: PersonalRecord | null })[]>(data.exercises ?? []);

	// ── Saving ──────────────────────────────────────────────────────────────
	async function put(body: Record<string, unknown>) {
		return fetch('/api/programs', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	async function post(body: Record<string, unknown>) {
		return fetch('/api/programs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	async function saveProgram(patch: Record<string, unknown>) {
		await put({ action: 'updateProgram', id: program.id, ...patch });
	}

	async function saveBlock(block: BlockDraft, patch: Record<string, unknown>) {
		await put({ action: 'updateBlock', id: block.id, ...patch });
	}

	function numOrNull(value: string): number | null {
		if (value.trim() === '') return null;
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}

	async function saveEntry(entry: EntryDraft, patch: Record<string, unknown> = {}) {
		await put({
			action: 'updateEntry',
			id: entry.id,
			sets: numOrNull(entry.sets),
			reps: entry.reps.trim() === '' ? null : entry.reps,
			weight: numOrNull(entry.weight),
			unit: entry.unit,
			notes: entry.notes.trim() === '' ? null : entry.notes,
			...patch
		});
	}

	// ── Blocks ──────────────────────────────────────────────────────────────
	async function addBlock() {
		const res = await post({
			action: 'createBlock',
			programId: program.id,
			title: `Block ${blocks.length + 1}`
		});
		if (!res.ok) return;
		const row = await res.json();
		blocks = [
			...blocks,
			{
				id: row.id,
				programId: program.id,
				title: row.title,
				weekdays: [],
				position: row.position ?? blocks.length,
				entries: []
			}
		];
	}

	async function removeBlock(block: BlockDraft) {
		if (!(await confirmAction(`Delete "${block.title}" and its exercises?`))) return;
		const res = await fetch(`/api/programs?type=block&id=${encodeURIComponent(block.id)}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			showToast('Block deleted');
			blocks = blocks.filter((b) => b.id !== block.id);
		}
	}

	function toggleWeekday(block: BlockDraft, day: number) {
		const weekdays = block.weekdays.includes(day)
			? block.weekdays.filter((w) => w !== day)
			: [...block.weekdays, day].sort();
		block.weekdays = weekdays;
		saveBlock(block, { weekdays });
	}

	function moveBlock(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= blocks.length) return;
		const a = blocks[index];
		const b = blocks[target];
		blocks[index] = b;
		blocks[target] = a;
		saveBlock(a, { position: b.position });
		saveBlock(b, { position: a.position });
	}

	// ── Entries ─────────────────────────────────────────────────────────────
	async function addTitle(block: BlockDraft) {
		const res = await post({
			action: 'createEntry',
			blockId: block.id,
			kind: 'title',
			title: 'Section'
		});
		if (!res.ok) return;
		const row = await res.json();
		block.entries = [
			...block.entries,
			{
				id: row.id,
				blockId: block.id,
				kind: 'title',
				title: 'Section',
				exerciseId: null,
				sets: '',
				reps: '',
				weight: '',
				unit: 'kg',
				notes: '',
				position: row.position ?? block.entries.length,
				exercise: null,
				pr: null
			}
		];
	}

	function moveEntry(block: BlockDraft, index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= block.entries.length) return;
		const a = block.entries[index];
		const b = block.entries[target];
		block.entries[index] = b;
		block.entries[target] = a;
		put({ action: 'updateEntry', id: a.id, position: b.position });
		put({ action: 'updateEntry', id: b.id, position: a.position });
	}

	async function removeEntry(block: BlockDraft, entry: EntryDraft) {
		if (!(await confirmAction('Remove this from the program?'))) return;
		const res = await fetch(`/api/programs?type=entry&id=${encodeURIComponent(entry.id)}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			block.entries = block.entries.filter((e) => e.id !== entry.id);
			showToast('Removed');
		}
	}

	// ── Exercise picker ─────────────────────────────────────────────────────
	let pickerOpen = $state(false);
	let pickerBlockId = $state('');
	let pickerSearch = $state('');
	let pickerGroup = $state<MuscleGroup | 'all'>('all');
	let pickerSelection = $state<Array<Exercise & { pr: PersonalRecord | null }>>([]);
	let addingExercises = $state(false);

	let pickerList = $derived(
		exercises.filter((e) => {
			if (pickerGroup !== 'all' && e.muscleGroup !== pickerGroup) return false;
			if (pickerSearch.trim() && !e.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
				return false;
			return true;
		})
	);

	function openPicker(block: BlockDraft) {
		pickerBlockId = block.id;
		pickerSearch = '';
		pickerGroup = 'all';
		pickerSelection = [];
		pickerOpen = true;
	}

	function togglePick(exercise: Exercise & { pr: PersonalRecord | null }) {
		pickerSelection = pickerSelection.some((e) => e.id === exercise.id)
			? pickerSelection.filter((e) => e.id !== exercise.id)
			: [...pickerSelection, exercise];
	}

	/** Add every selected exercise in one go, then append the rows locally. */
	async function addSelected() {
		const block = blocks.find((b) => b.id === pickerBlockId);
		if (!block || pickerSelection.length === 0 || addingExercises) return;
		addingExercises = true;

		const created = await Promise.all(
			pickerSelection.map((ex) =>
				post({
					action: 'createEntry',
					blockId: block.id,
					kind: 'exercise',
					exerciseId: ex.id,
					sets: 3,
					reps: '8-10',
					weight: 0,
					unit: 'kg'
				}).then(async (res) => (res.ok ? res.json() : null))
			)
		);

		let position = block.entries.reduce((max, e) => Math.max(max, e.position), -1) + 1;
		const drafts = created.flatMap((row, i) => {
			if (!row) return [];
			const ex = pickerSelection[i];
			position += 1;
			return [
				{
					id: row.id as string,
					blockId: block.id,
					kind: 'exercise' as const,
					title: '',
					exerciseId: ex.id,
					sets: '3',
					reps: '8-10',
					weight: '0',
					unit: 'kg',
					notes: '',
					position: position - 1,
					exercise: ex,
					pr: ex.pr ?? null
				}
			];
		});
		block.entries = [...block.entries, ...drafts];

		addingExercises = false;
		pickerSelection = [];
		pickerOpen = false;
	}

	function formatPr(pr: PersonalRecord | null): string | null {
		if (!pr || (pr.maxWeight === null && pr.maxReps === null)) return null;
		if (pr.maxWeight !== null) {
			return `${pr.maxReps ?? '–'} × ${pr.maxWeight} ${pr.unit ?? 'kg'}`;
		}
		return `${pr.maxReps} reps`;
	}
</script>

<svelte:head>
	<title>{program.name} - Training Programs - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-3.5 py-4 pb-24 sm:p-8 sm:pb-8">
	<PageHeader title={program.name} subtitle="Plan blocks, exercises, sets and reps">
		<Button href="/app/training/programs" variant="secondary" size="sm">
			<i class="fas fa-arrow-left mr-1.5 text-xs sm:mr-2"></i>
			Programs
		</Button>
	</PageHeader>

	<!-- Program settings -->
	<div class="mb-6 space-y-3 rounded-sm border border-border bg-surface p-4">
		<div class="flex flex-wrap items-end gap-3">
			<Input
				label="Program name"
				bind:value={program.name}
				onchange={() => saveProgram({ name: program.name })}
				class="min-w-52 flex-1"
			/>
			<div class="pb-1">
				<Switch
					checked={program.active}
					label="Show on calendar"
					onchange={(checked) => saveProgram({ active: checked })}
				/>
			</div>
		</div>
		<Textarea
			label="Description"
			bind:value={program.description}
			rows={2}
			placeholder="Goals, cycle length, notes..."
			onchange={() => saveProgram({ description: program.description ?? '' })}
		/>
	</div>

	<!-- Blocks -->
	<div class="space-y-4">
		{#each blocks as block, bi (block.id)}
			<div class="rounded-sm border border-border bg-surface">
				<div class="border-b border-border p-4">
					<div class="flex flex-wrap items-center gap-2">
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
								disabled={bi === 0}
								aria-label="Move block up"
								onclick={() => moveBlock(bi, -1)}
							>
								<i class="fas fa-arrow-up text-[10px]"></i>
							</button>
							<button
								type="button"
								class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
								disabled={bi === blocks.length - 1}
								aria-label="Move block down"
								onclick={() => moveBlock(bi, 1)}
							>
								<i class="fas fa-arrow-down text-[10px]"></i>
							</button>
						</div>
						<Input
							bind:value={block.title}
							onchange={() => saveBlock(block, { title: block.title })}
							class="min-w-40 flex-1"
						/>
						<button
							type="button"
							class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-error/10 hover:text-error"
							aria-label="Delete block"
							onclick={() => removeBlock(block)}
						>
							<i class="fas fa-trash text-xs"></i>
						</button>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-1.5">
						<span class="mr-1 text-xs text-fg-subdued">Trained on</span>
						{#each DAY_LABELS as label, day (label)}
							<button
								type="button"
								class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {block.weekdays.includes(
									day
								)
									? 'bg-primary text-white'
									: 'bg-muted text-fg hover:bg-border'}"
								onclick={() => toggleWeekday(block, day)}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Entries -->
				<div class="divide-y divide-border/60">
					{#each block.entries as entry, ei (entry.id)}
						{#if entry.kind === 'title'}
							<div class="flex items-center gap-2 bg-muted/40 px-4 py-2">
								<i class="fas fa-heading text-xs text-fg-subdued"></i>
								<Input
									bind:value={entry.title}
									onchange={() => saveEntry(entry, { title: entry.title })}
									class="flex-1"
								/>
								<div class="flex items-center gap-1">
									<button
										type="button"
										class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
										disabled={ei === 0}
										aria-label="Move up"
										onclick={() => moveEntry(block, ei, -1)}
									>
										<i class="fas fa-arrow-up text-[10px]"></i>
									</button>
									<button
										type="button"
										class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
										disabled={ei === block.entries.length - 1}
										aria-label="Move down"
										onclick={() => moveEntry(block, ei, 1)}
									>
										<i class="fas fa-arrow-down text-[10px]"></i>
									</button>
									<button
										type="button"
										class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-error/10 hover:text-error"
										aria-label="Remove title"
										onclick={() => removeEntry(block, entry)}
									>
										<i class="fas fa-xmark text-xs"></i>
									</button>
								</div>
							</div>
						{:else}
							<div class="p-4">
								<div class="flex items-start gap-3">
									<div
										class="h-14 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-muted"
									>
										{#if entry.exercise?.images[0]}
											<img
												src={entry.exercise.images[0]}
												alt={entry.exercise.name}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<i class="fas fa-dumbbell text-fg-subdued"></i>
											</div>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-1.5">
											<p class="text-sm font-medium text-fg">
												{entry.exercise?.name ?? 'Unknown exercise'}
											</p>
											{#if entry.exercise}
												<Badge size="sm">{GROUP_LABELS[entry.exercise.muscleGroup]}</Badge>
											{/if}
											{#if formatPr(entry.pr)}
												<Badge size="sm" variant="success">PR {formatPr(entry.pr)}</Badge>
											{/if}
										</div>
										<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
											<Input
												label="Sets"
												type="number"
												size="sm"
												min={0}
												bind:value={entry.sets}
												onchange={() => saveEntry(entry)}
											/>
											<Input
												label="Reps"
												size="sm"
												placeholder="6-8"
												bind:value={entry.reps}
												onchange={() => saveEntry(entry)}
											/>
											<Input
												label="Weight"
												type="number"
												size="sm"
												min={0}
												step={0.5}
												bind:value={entry.weight}
												onchange={() => saveEntry(entry)}
											/>
											<Select
												label="Unit"
												size="sm"
												bind:value={entry.unit}
												onchange={() => saveEntry(entry)}
											>
												<option value="kg">kg</option>
												<option value="lbs">lbs</option>
											</Select>
										</div>
										<div class="mt-2">
											<Textarea
												bind:value={entry.notes}
												rows={2}
												placeholder="Notes under the exercise..."
												onchange={() => saveEntry(entry)}
											/>
										</div>
									</div>
									<div class="flex shrink-0 flex-col items-center gap-1">
										<button
											type="button"
											class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
											disabled={ei === 0}
											aria-label="Move up"
											onclick={() => moveEntry(block, ei, -1)}
										>
											<i class="fas fa-arrow-up text-[10px]"></i>
										</button>
										<button
											type="button"
											class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted disabled:opacity-30"
											disabled={ei === block.entries.length - 1}
											aria-label="Move down"
											onclick={() => moveEntry(block, ei, 1)}
										>
											<i class="fas fa-arrow-down text-[10px]"></i>
										</button>
										<button
											type="button"
											class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-error/10 hover:text-error"
											aria-label="Remove exercise"
											onclick={() => removeEntry(block, entry)}
										>
											<i class="fas fa-xmark text-xs"></i>
										</button>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<div class="flex flex-wrap items-center gap-2 border-t border-border p-3">
					<Button variant="primary" size="sm" onclick={() => openPicker(block)}>
						<i class="fas fa-plus mr-1.5 text-xs"></i>
						Add exercise
					</Button>
					<Button variant="secondary" size="sm" onclick={() => addTitle(block)}>
						<i class="fas fa-heading mr-1.5 text-xs"></i>
						Add title
					</Button>
					<div class="flex-1"></div>
					<Button href="/app/training/session/new?block={block.id}" variant="outline" size="sm">
						<i class="fas fa-play mr-1.5 text-xs"></i>
						Start session
					</Button>
				</div>
			</div>
		{/each}
	</div>

	<button
		type="button"
		class="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border py-3 text-sm text-fg-subdued transition-colors hover:border-primary-text/50 hover:text-fg"
		onclick={addBlock}
	>
		<i class="fas fa-plus text-xs"></i>
		Add block
	</button>
</div>

<!-- Exercise picker -->
<Dialog bind:open={pickerOpen} title="Choose an exercise">
	<div class="space-y-3">
		<SearchInput bind:value={pickerSearch} placeholder="Search the library..." />
		<div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
			<button
				type="button"
				class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {pickerGroup ===
				'all'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (pickerGroup = 'all')}
			>
				All
			</button>
			{#each Object.entries(GROUP_LABELS) as [key, label] (key)}
				<button
					type="button"
					class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {pickerGroup ===
					key
						? 'bg-primary text-white'
						: 'bg-muted text-fg hover:bg-border'}"
					onclick={() => (pickerGroup = key as MuscleGroup)}
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="max-h-80 space-y-1 overflow-y-auto">
			{#each pickerList as exercise (exercise.id)}
				{@const selected = pickerSelection.some((e) => e.id === exercise.id)}
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 rounded-sm border p-2 text-left transition-colors {selected
						? 'border-primary bg-primary/5'
						: 'border-transparent hover:bg-muted'}"
					onclick={() => togglePick(exercise)}
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
							{GROUP_LABELS[exercise.muscleGroup]}
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
		<Button variant="secondary" onclick={() => (pickerOpen = false)}>Cancel</Button>
		<Button disabled={pickerSelection.length === 0} loading={addingExercises} onclick={addSelected}>
			Add {pickerSelection.length} exercise{pickerSelection.length === 1 ? '' : 's'}
		</Button>
	{/snippet}
</Dialog>
