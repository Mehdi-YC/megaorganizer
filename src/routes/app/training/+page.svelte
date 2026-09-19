<script lang="ts">
	import SessionListItem from '$lib/components/ui/SessionListItem.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();
	let sessions = $derived<any[]>(data.sessions ?? []);
	let filterType = $state('all');

	let filteredSessions = $derived(
		filterType === 'all'
			? sessions
			: sessions.filter((s: any) => s.activityTypes?.includes(filterType))
	);
</script>

<svelte:head>
	<title>Training - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-fg-accent">Training Sessions</h1>
			<p class="mt-1 text-sm text-fg-subdued">All your training sessions</p>
		</div>
		<div class="flex gap-2">
			<a href="/app/training/running">
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg border border-border hover:border-fg-subdued"
				>
					<i class="fas fa-person-running mr-2 text-xs"></i>
					Running
				</button>
			</a>
			<a href="/app/training/session/new">
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
				>
					<i class="fas fa-plus mr-2 text-xs"></i>
					New Session
				</button>
			</a>
		</div>
	</div>

	<div class="mb-6 flex items-center gap-2">
		<button
			type="button"
			class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType === 'all'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'all')}
		>
			All
		</button>
		<button
			type="button"
			class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType === 'running'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'running')}
		>
			Running
		</button>
		<button
			type="button"
			class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType === 'strength'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'strength')}
		>
			Strength
		</button>
	</div>

	{#if filteredSessions.length === 0}
		<EmptyState icon="fa-dumbbell" message="No sessions found" submessage="Start your first training session" />
	{:else}
		<div class="space-y-2">
			{#each filteredSessions as session}
				<SessionListItem {session} />
			{/each}
		</div>
	{/if}
</div>
