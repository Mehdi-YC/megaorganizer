<script lang="ts">
	import SessionListItem from '$lib/components/ui/SessionListItem.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();
	let sessions = $derived(data.sessions ?? []);
	let filterType = $state('all');

	let filteredSessions = $derived(
		filterType === 'all'
			? sessions
			: sessions.filter((s) => s.activityTypes?.includes(filterType))
	);
</script>

<svelte:head>
	<title>Training History - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-8">
		<h1 class="text-lg font-semibold text-fg-accent">Training History</h1>
		<p class="mt-2 text-fg-subdued">All your training sessions</p>
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
		<EmptyState icon="fa-clock-rotate-left" message="No sessions found" />
	{:else}
		<div class="space-y-2">
			{#each filteredSessions as session}
				<SessionListItem {session} />
			{/each}
		</div>
	{/if}
</div>
