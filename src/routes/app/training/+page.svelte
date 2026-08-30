<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();
	let sessions = $state(data.sessions ?? []);

	const recentSessions = sessions.slice(0, 5);
	const totalDuration = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
</script>

<svelte:head>
	<title>Training - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6 sm:mb-8">
		<h1 class="text-lg font-semibold text-fg-accent">Training</h1>
		<p class="mt-2 text-fg-subdued">Track your workouts and activities</p>
	</div>

	<div class="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-sm border border-border bg-surface p-6">
			<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-calendar-check text-primary"></i>
			</div>
			<p class="text-2xl font-semibold text-fg">{sessions.length}</p>
			<p class="text-sm text-fg-subdued">Total Sessions</p>
		</div>

		<div class="rounded-sm border border-border bg-surface p-6">
			<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-route text-primary"></i>
			</div>
			<p class="text-2xl font-semibold text-fg">
				{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
			</p>
			<p class="text-sm text-fg-subdued">Total Time</p>
		</div>

		<div class="rounded-sm border border-border bg-surface p-6">
			<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-clock text-primary"></i>
			</div>
			<p class="text-2xl font-semibold text-fg">
				{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
			</p>
			<p class="text-sm text-fg-subdued">Total Time</p>
		</div>

		<div class="rounded-sm border border-border bg-surface p-6">
			<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-fire text-primary"></i>
			</div>
			<p class="text-2xl font-semibold text-fg">
				{sessions.filter((s) => {
					const d = new Date(s.startedAt);
					const now = new Date();
					return (
						d.getFullYear() === now.getFullYear() &&
						d.getMonth() === now.getMonth() &&
						d.getDate() === now.getDate()
					);
				}).length}
			</p>
			<p class="text-sm text-fg-subdued">Today</p>
		</div>
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Activity</h2>
				<a href="/app/training/history" class="text-sm text-primary hover:text-primary-hover">
					View All
				</a>
			</div>

			{#if recentSessions.length === 0}
			<div class="mt-4 rounded-sm border border-border bg-surface py-12 text-center">
				<i class="fas fa-dumbbell mb-4 text-4xl text-fg-subdued"></i>
				<p class="text-fg-subdued">No training sessions yet</p>
				<a
					href="/app/training/session/new"
					class="mt-4 inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
					>
						Start Your First Session
					</a>
				</div>
			{:else}
				<div class="mt-4 space-y-2">
					{#each recentSessions as session}
						<a
							href="/app/training/session/{session.id}"
					class="flex items-center justify-between rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
				>
					<div class="flex items-center gap-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
							<i class="fas fa-dumbbell text-primary"></i>
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
							<i class="fas fa-chevron-right text-fg-subdued"></i>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<div>
			<h2 class="mb-4 text-sm font-semibold text-fg-accent uppercase tracking-wide">Quick Actions</h2>
			<div class="space-y-2">
			<a
				href="/app/training/running"
				class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-success/15">
					<i class="fas fa-person-running text-green-600"></i>
					</div>
					<span class="font-medium text-fg">Start Running</span>
				</a>

			<a
				href="/app/training/session/new"
				class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary-subdued">
					<i class="fas fa-dumbbell text-blue-600"></i>
					</div>
					<span class="font-medium text-fg">Start Strength</span>
				</a>

			<a
				href="/app/training/calendar"
				class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary-subdued">
					<i class="fas fa-calendar text-purple-600"></i>
					</div>
					<span class="font-medium text-fg">Calendar</span>
				</a>

			<a
				href="/app/library"
				class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/15">
					<i class="fas fa-book text-orange-600"></i>
					</div>
					<span class="font-medium text-fg">Exercises</span>
				</a>
			</div>
		</div>
	</div>
</div>
