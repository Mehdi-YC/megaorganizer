<script lang="ts">
	import { resolve } from '$app/paths';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { formatTime, formatPace } from '$lib/utils';
	import RunMap from '$lib/components/ui/RunMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { RunningActivity, SessionExerciseRecord } from '$lib/types';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let session = $state(data.session);
	let activities = $derived(data.activities ?? []);
	// Writable derived: record edits update the rows without a reload.
	let records = $derived<SessionExerciseRecord[]>(data.records ?? []);
	let editing = $state(false);
	// svelte-ignore state_referenced_locally
	let title = $state(session?.title ?? '');
	// svelte-ignore state_referenced_locally
	let notes = $state(session?.notes ?? '');

	// Inline editing of a single logged record.
	let editingRecordId = $state<string | null>(null);
	let recSets = $state('');
	let recReps = $state('');
	let recWeight = $state('');
	let recRpe = $state('');
	let recRest = $state('');
	let recNotes = $state('');

	let recordsByActivity = $derived.by(() => {
		const map = new Map<string, SessionExerciseRecord[]>();
		for (const r of records) {
			const list = map.get(r.activityId) ?? [];
			list.push(r);
			map.set(r.activityId, list);
		}
		return map;
	});

	function startRecordEdit(r: SessionExerciseRecord) {
		editingRecordId = r.id;
		recSets = r.sets !== null ? String(r.sets) : '';
		recReps = r.reps ?? '';
		recWeight = r.weight !== null ? String(r.weight) : '';
		recRpe = r.rpe !== null ? String(r.rpe) : '';
		recRest = r.restTime !== null ? String(r.restTime) : '';
		recNotes = r.notes ?? '';
	}

	async function saveRecord(r: SessionExerciseRecord) {
		const patch: Record<string, unknown> = { action: 'updateExerciseRecord', recordId: r.id };
		if (recSets.trim() !== '') patch.sets = Number(recSets);
		if (recReps.trim() !== '') patch.reps = recReps.trim();
		if (recWeight.trim() !== '') patch.weight = Number(recWeight);
		if (recRpe.trim() !== '') patch.rpe = Number(recRpe);
		if (recRest.trim() !== '') patch.restTime = Number(recRest);
		if (recNotes.trim() !== '') patch.notes = recNotes.trim();

		const previous = { ...r };
		Object.assign(r, {
			sets: patch.sets ?? r.sets,
			reps: patch.reps ?? r.reps,
			weight: patch.weight ?? r.weight,
			rpe: patch.rpe ?? r.rpe,
			restTime: patch.restTime ?? r.restTime,
			notes: patch.notes ?? r.notes
		});
		editingRecordId = null;

		const response = await fetch('/api/training', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!response.ok) Object.assign(r, previous);
	}

	async function deleteRecord(r: SessionExerciseRecord) {
		if (!(await confirmAction(`Delete the logged set for "${r.name}"?`))) return;
		const response = await fetch('/api/training', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteExerciseRecord', recordId: r.id })
		});
		if (response.ok) records = records.filter((x) => x.id !== r.id);
	}

	let runningData = $state<RunningActivity[]>([]);
	let loadingRunning = $state(false);

	onMount(() => {
		if (session?.id) {
			loadingRunning = true;
			fetch(`/api/running?sessionId=${session.id}`)
				.then((r) => r.json())
				.then((d) => {
					runningData = Array.isArray(d) ? d : [];
					loadingRunning = false;
				})
				.catch(() => {
					runningData = [];
					loadingRunning = false;
				});
		}
	});

	async function saveSession() {
		if (!session) return;
		const response = await fetch('/api/training', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateSession', sessionId: session.id, title, notes })
		});
		if (response.ok) {
			editing = false;
			session = { ...session, title, notes };
		}
	}

	async function deleteSession() {
		if (!(await confirmAction('Are you sure you want to delete this session?'))) return;
		const response = await fetch('/api/training', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteSession', sessionId: session?.id })
		});
		if (response.ok) goto(resolve('/app/training/calendar'));
	}
</script>

<svelte:head>
	<title>{session?.title || 'Training Session'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	{#if !session}
		<EmptyState icon="fa-exclamation-triangle" message="Session not found">
			<a
				href={resolve('/app/training/calendar')}
				class="text-primary-text hover:text-primary-text-hover">Back to Calendar</a
			>
		</EmptyState>
	{:else}
		<div class="mb-8 flex items-start justify-between">
			<div>
				{#if editing}
					<Input bind:value={title} />
				{:else}
					<h1 class="mb-2 text-lg font-semibold text-fg-accent">
						{session.title || 'Training Session'}
					</h1>
				{/if}
				<p class="text-fg-subdued">
					{new Date(session.startedAt).toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
					· {formatTime(session.duration)}
				</p>
			</div>
			<div class="flex gap-2">
				{#if editing}
					<Button variant="primary" onclick={saveSession}>Save</Button>
					<Button variant="secondary" onclick={() => (editing = false)}>Cancel</Button>
				{:else}
					<Button variant="secondary" onclick={() => (editing = true)}>
						<i class="fas fa-pen mr-2"></i> Edit
					</Button>
					<Button variant="danger" onclick={deleteSession}>
						<i class="fas fa-trash mr-2"></i> Delete
					</Button>
				{/if}
			</div>
		</div>

		{#if editing}
			<div class="mb-8">
				<Textarea
					label="Notes"
					bind:value={notes}
					rows={4}
					placeholder="Add notes about this session..."
				/>
			</div>
		{:else if session.notes}
			<div class="mb-8 rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-2 text-xs font-semibold tracking-wide text-fg-accent uppercase">Notes</h3>
				<p class="text-sm whitespace-pre-wrap text-fg-subdued">{session.notes}</p>
			</div>
		{/if}

		{#if loadingRunning}
			<div
				class="mb-8 flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-3 text-xs text-fg-subdued"
			>
				<Spinner size="sm" />
				<span>Loading route map...</span>
			</div>
		{:else if runningData.length > 0}
			<div class="mb-8">
				<h2 class="mb-4 text-xs font-semibold tracking-wide text-fg-accent uppercase">Route Map</h2>
				{#each runningData as run (run.activityId)}
					{#if run.trackPoints && run.trackPoints.length > 0}
						<div class="overflow-hidden rounded-sm border border-border" style="height: 400px;">
							<RunMap
								points={run.trackPoints.map((p) => ({
									latitude: p.latitude,
									longitude: p.longitude,
									timestamp: new Date(p.timestamp).getTime()
								}))}
								showRoute={true}
							/>
						</div>
						{#if run.runningActivity}
							<div
								class="mt-3 grid grid-cols-3 gap-4 rounded-sm border border-border bg-surface p-4"
							>
								<div class="text-center">
									<div class="text-xl font-bold">
										{((run.runningActivity.distance || 0) / 1000).toFixed(2)}
									</div>
									<div class="text-xs text-fg-subdued">km</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">
										{formatTime(run.runningActivity.elapsedDuration || 0)}
									</div>
									<div class="text-xs text-fg-subdued">duration</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">
										{formatPace(run.runningActivity.averagePace || 0)}
									</div>
									<div class="text-xs text-fg-subdued">avg pace</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">
										{((run.runningActivity.averageSpeed || 0) * 3.6).toFixed(1)}
									</div>
									<div class="text-xs text-fg-subdued">avg km/h</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">
										{((run.runningActivity.maxSpeed || 0) * 3.6).toFixed(1)}
									</div>
									<div class="text-xs text-fg-subdued">max km/h</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">
										{formatPace(run.runningActivity.bestPace || 0)}
									</div>
									<div class="text-xs text-fg-subdued">best pace</div>
								</div>
							</div>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}

		<div class="mb-8">
			<h2 class="mb-4 text-xs font-semibold tracking-wide text-fg-accent uppercase">Activities</h2>

			{#if activities.length === 0}
				<EmptyState icon="fa-clipboard-list" message="No activities recorded" />
			{:else}
				<div class="space-y-4">
					{#each activities as activity (activity.id)}
						{@const recs = recordsByActivity.get(activity.id) ?? []}
						<div class="rounded-sm border border-border bg-surface p-4">
							<div class="mb-2 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Badge variant="primary">{activity.type}</Badge>
									{#if activity.startedAt}
										<span class="text-sm text-fg-subdued">
											{new Date(activity.startedAt).toLocaleTimeString()}
										</span>
									{/if}
								</div>
							</div>
							{#if activity.notes}
								<p class="text-sm text-fg-subdued">{activity.notes}</p>
							{/if}

							{#if recs.length > 0}
								<div class="mt-3 overflow-x-auto">
									<table class="w-full text-sm">
										<thead>
											<tr class="border-b border-border text-left text-xs text-fg-subdued">
												<th class="py-1.5 pr-3 font-medium">Exercise</th>
												<th class="py-1.5 pr-3 font-medium">Sets</th>
												<th class="py-1.5 pr-3 font-medium">Reps</th>
												<th class="py-1.5 pr-3 font-medium">Weight</th>
												<th class="py-1.5 pr-3 font-medium">RPE</th>
												<th class="py-1.5 pr-3 font-medium">Rest</th>
												<th class="py-1.5 pr-3 font-medium">Notes</th>
												<th class="py-1.5"></th>
											</tr>
										</thead>
										<tbody>
											{#each recs as record (record.id)}
												{#if editingRecordId === record.id}
													<tr class="border-b border-border/50">
														<td class="py-2 pr-3 font-medium text-fg">{record.name}</td>
														<td class="py-2 pr-3">
															<input
																type="number"
																bind:value={recSets}
																aria-label="Sets"
																class="h-8 w-14 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2 pr-3">
															<input
																type="text"
																bind:value={recReps}
																aria-label="Reps"
																class="h-8 w-16 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2 pr-3">
															<input
																type="number"
																bind:value={recWeight}
																aria-label="Weight"
																class="h-8 w-16 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2 pr-3">
															<input
																type="number"
																bind:value={recRpe}
																aria-label="RPE"
																class="h-8 w-12 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2 pr-3">
															<input
																type="number"
																bind:value={recRest}
																aria-label="Rest seconds"
																class="h-8 w-14 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2 pr-3">
															<input
																type="text"
																bind:value={recNotes}
																aria-label="Notes"
																class="h-8 w-32 rounded-sm border border-border bg-surface px-1.5 text-xs"
															/>
														</td>
														<td class="py-2">
															<div class="flex items-center gap-1">
																<Button size="sm" onclick={() => saveRecord(record)}>Save</Button>
																<Button
																	size="sm"
																	variant="secondary"
																	onclick={() => (editingRecordId = null)}
																>
																	Cancel
																</Button>
															</div>
														</td>
													</tr>
												{:else}
													<tr class="border-b border-border/50">
														<td class="py-2 pr-3 font-medium text-fg">{record.name}</td>
														<td class="py-2 pr-3 text-fg">{record.sets ?? '–'}</td>
														<td class="py-2 pr-3 text-fg">{record.reps ?? '–'}</td>
														<td class="py-2 pr-3 text-fg">
															{record.weight !== null
																? `${record.weight} ${record.unit ?? 'kg'}`
																: '–'}
														</td>
														<td class="py-2 pr-3 text-fg">{record.rpe ?? '–'}</td>
														<td class="py-2 pr-3 text-fg">
															{record.restTime !== null ? `${record.restTime}s` : '–'}
														</td>
														<td class="max-w-48 truncate py-2 pr-3 text-fg-subdued"
															>{record.notes ?? ''}</td
														>
														<td class="py-2">
															<div class="flex items-center gap-1">
																<button
																	type="button"
																	class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
																	aria-label="Edit record"
																	title="Edit"
																	onclick={() => startRecordEdit(record)}
																>
																	<i class="fas fa-pen text-[10px]"></i>
																</button>
																<button
																	type="button"
																	class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-error/10 hover:text-error"
																	aria-label="Delete record"
																	title="Delete"
																	onclick={() => deleteRecord(record)}
																>
																	<i class="fas fa-trash text-[10px]"></i>
																</button>
															</div>
														</td>
													</tr>
												{/if}
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
