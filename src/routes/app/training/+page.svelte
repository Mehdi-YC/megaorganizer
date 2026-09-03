<script lang="ts">
	import { formatTime } from '$lib/utils';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import SessionListItem from '$lib/components/ui/SessionListItem.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();
	let sessions = $derived(data.sessions ?? []);

	function getWeekStart(date: Date): Date {
		const d = new Date(date);
		const day = d.getDay();
		const diff = (day + 6) % 7;
		d.setDate(d.getDate() - diff);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	const weekStart = getWeekStart(new Date());
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	const thisWeekSessions = $derived(
		sessions.filter((s) => {
			const d = new Date(s.startedAt);
			return d >= weekStart && d < weekEnd;
		})
	);

	let totalDuration = $derived(sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0));
	let todayCount = $derived(sessions.filter((s) => {
		const d = new Date(s.startedAt);
		const now = new Date();
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
	}).length);
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
		<StatCard icon="fa-calendar-check" value={sessions.length} label="Total Sessions" />
		<StatCard icon="fa-route" value="{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m" label="Total Time" />
		<StatCard icon="fa-fire" value="{sessions.length > 0 ? Math.floor(totalDuration / sessions.length / 60) : 0}m" label="Avg Duration" />
		<StatCard icon="fa-calendar-day" value={todayCount} label="Today" />
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<div class="flex items-center justify-between">
				<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">This Week</h2>
				<a href="/app/training/history" class="text-sm text-primary hover:text-primary-hover">View All</a>
			</div>

			{#if thisWeekSessions.length === 0}
				<div class="mt-4">
					<EmptyState icon="fa-dumbbell" message="No sessions this week" submessage="Start a session to begin tracking" />
				</div>
			{:else}
				<div class="mt-4 space-y-2">
					{#each thisWeekSessions as session}
						<SessionListItem {session} />
					{/each}
				</div>
			{/if}
		</div>

		<div>
			<h2 class="mb-4 text-xs font-semibold text-fg-accent uppercase tracking-wide">Quick Actions</h2>
			<div class="space-y-2">
				<a href="/app/training/running" class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary">
					<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-success/15">
						<i class="fas fa-person-running text-green-600"></i>
					</div>
					<span class="font-medium text-fg">Start Running</span>
				</a>

				<a href="/app/training/session/new" class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary">
					<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary-subdued">
						<i class="fas fa-dumbbell text-blue-600"></i>
					</div>
					<span class="font-medium text-fg">Start Strength</span>
				</a>

				<a href="/app/training/calendar" class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary">
					<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary-subdued">
						<i class="fas fa-calendar text-purple-600"></i>
					</div>
					<span class="font-medium text-fg">Calendar</span>
				</a>

				<a href="/app/library" class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary">
					<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/15">
						<i class="fas fa-book text-orange-600"></i>
					</div>
					<span class="font-medium text-fg">Exercises</span>
				</a>
			</div>
		</div>
	</div>
</div>
