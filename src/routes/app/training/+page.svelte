<script lang="ts">
	import SessionListItem from '$lib/components/ui/SessionListItem.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

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
	<PageHeader title="Training Sessions" subtitle="All your training sessions">
		<Button href="/app/training/running" variant="secondary" size="md">
			<i class="fas fa-person-running mr-2 text-xs"></i>
			Running
		</Button>
		<Button href="/app/training/session/new" variant="primary" size="md">
			<i class="fas fa-plus mr-2 text-xs"></i>
			New Session
		</Button>
	</PageHeader>

	<div class="mb-6 flex items-center gap-2">
		<button
			type="button"
			class="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType ===
			'all'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'all')}
		>
			All
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType ===
			'running'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'running')}
		>
			Running
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {filterType ===
			'strength'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => (filterType = 'strength')}
		>
			Strength
		</button>
	</div>

	{#if filteredSessions.length === 0}
		<EmptyState
			icon="fa-dumbbell"
			message="No sessions found"
			submessage="Start your first training session"
		/>
	{:else}
		<div class="space-y-2">
			{#each filteredSessions as session}
				<SessionListItem {session} />
			{/each}
		</div>
	{/if}
</div>
