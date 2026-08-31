<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();
	let sessions = $state(data.sessions ?? []);
	let filterType = $state('all');

	const activityIcons: Record<string, { icon: string; color: string }> = {
		strength: { icon: 'fa-dumbbell', color: 'text-blue-500' },
		running: { icon: 'fa-person-running', color: 'text-green-500' },
		cycling: { icon: 'fa-bicycle', color: 'text-orange-500' },
		walking: { icon: 'fa-person-walking', color: 'text-yellow-500' },
		swimming: { icon: 'fa-person-swimming', color: 'text-cyan-500' },
		other: { icon: 'fa-circle-dot', color: 'text-fg-subdued' }
	};

	function getSessionIcon(activityTypes: string[]) {
		if (!activityTypes || activityTypes.length === 0) return activityIcons.other;
		return activityIcons[activityTypes[0]] ?? activityIcons.other;
	}

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
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-clock-rotate-left mb-4 text-4xl text-fg-subdued"></i>
			<p class="text-fg-subdued">No sessions found</p>
		</div>
	{:else}
		<div class="space-y-2">
		{#each filteredSessions as session}
				{@const icon = getSessionIcon(session.activityTypes)}
				<a
					href="/app/training/session/{session.id}"
					class="flex items-center justify-between rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
				>
					<div class="flex items-center gap-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
							<i class="fas {icon.icon} {icon.color}"></i>
						</div>
						<div>
							<p class="font-medium text-fg">{session.title || 'Training Session'}</p>
							<p class="text-sm text-fg-subdued">
								{new Date(session.startedAt).toLocaleDateString()}
								{#if session.duration}
									· {Math.floor(session.duration / 60)}m
								{/if}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-4">
						{#if session.status === 'completed' || (session.duration && session.duration > 0)}
							<span class="inline-flex items-center rounded-sm bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
								Completed
							</span>
						{:else if session.status === 'active'}
							<span class="inline-flex items-center rounded-sm bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
								Active
							</span>
						{:else if session.status === 'cancelled'}
							<span class="inline-flex items-center rounded-sm bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
								Cancelled
							</span>
						{/if}
						<i class="fas fa-chevron-right text-fg-subdued"></i>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
