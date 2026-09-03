<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { formatTime, formatPace } from '$lib/utils';
	import RunMap from '$lib/components/ui/RunMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	let { data } = $props();
	let session = $state(data.session);
	let activities = $derived(data.activities ?? []);
	let editing = $state(false);
	let title = $state(session?.title ?? '');
	let notes = $state(session?.notes ?? '');

	let runningData = $state<any[]>([]);
	let loadingRunning = $state(false);

	onMount(() => {
		if (session?.id) {
			loadingRunning = true;
			fetch(`/api/running?sessionId=${session.id}`)
				.then((r) => r.json())
				.then((d) => { runningData = Array.isArray(d) ? d : []; loadingRunning = false; })
				.catch(() => { runningData = []; loadingRunning = false; });
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
		if (!confirm('Are you sure you want to delete this session?')) return;
		const response = await fetch('/api/training', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteSession', sessionId: session?.id })
		});
		if (response.ok) goto('/app/training/calendar');
	}
</script>

<svelte:head>
	<title>{session?.title || 'Training Session'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	{#if !session}
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-exclamation-triangle mb-4 text-4xl text-fg-subdued"></i>
			<p class="text-fg-subdued">Session not found</p>
			<a href="/app/training/calendar" class="mt-4 text-primary hover:text-primary-hover">Back to Calendar</a>
		</div>
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
						weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
				<Textarea label="Notes" bind:value={notes} rows={4} placeholder="Add notes about this session..." />
			</div>
		{:else if session.notes}
			<div class="mb-8 rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-2 text-xs font-semibold text-fg-accent uppercase tracking-wide">Notes</h3>
				<p class="text-sm text-fg-subdued whitespace-pre-wrap">{session.notes}</p>
			</div>
		{/if}

		{#if runningData.length > 0}
			<div class="mb-8">
				<h2 class="mb-4 text-xs font-semibold text-fg-accent uppercase tracking-wide">Route Map</h2>
				{#each runningData as run}
					{#if run.trackPoints && run.trackPoints.length > 0}
						<div class="rounded-sm border border-border overflow-hidden" style="height: 400px;">
							<RunMap
								points={run.trackPoints.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }))}
								showRoute={true}
							/>
						</div>
						{#if run.runningActivity}
							<div class="mt-3 grid grid-cols-3 gap-4 rounded-sm border border-border bg-surface p-4">
								<div class="text-center">
									<div class="text-xl font-bold">{((run.runningActivity.distance || 0) / 1000).toFixed(2)}</div>
									<div class="text-xs text-fg-subdued">km</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">{formatTime(run.runningActivity.elapsedDuration || 0)}</div>
									<div class="text-xs text-fg-subdued">duration</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">{formatPace(run.runningActivity.averagePace || 0)}</div>
									<div class="text-xs text-fg-subdued">avg pace</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">{((run.runningActivity.averageSpeed || 0) * 3.6).toFixed(1)}</div>
									<div class="text-xs text-fg-subdued">avg km/h</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">{((run.runningActivity.maxSpeed || 0) * 3.6).toFixed(1)}</div>
									<div class="text-xs text-fg-subdued">max km/h</div>
								</div>
								<div class="text-center">
									<div class="text-xl font-bold">{formatPace(run.runningActivity.bestPace || 0)}</div>
									<div class="text-xs text-fg-subdued">best pace</div>
								</div>
							</div>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}

		<div class="mb-8">
			<h2 class="mb-4 text-xs font-semibold text-fg-accent uppercase tracking-wide">Activities</h2>

			{#if activities.length === 0}
				<div class="rounded-sm border border-border bg-surface py-8 text-center">
					<p class="text-fg-subdued">No activities recorded</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each activities as activity}
						<div class="rounded-sm border border-border bg-surface p-4">
							<div class="mb-2 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="inline-flex items-center rounded-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
										{activity.type}
									</span>
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
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
