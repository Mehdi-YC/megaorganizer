<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();
	let analytics = $derived(data.analytics);
	let currency = $derived(data.settings?.currency ?? 'DZD');

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return `${h}h ${m}m`;
	}

	function getSpendingTrend(): { value: number; positive: boolean } | null {
		if (!analytics) return null;
		const { thisMonthTotal, lastMonthTotal } = analytics.spending;
		if (lastMonthTotal === 0) return null;
		const change = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
		return {
			value: Math.abs(Math.round(change)),
			positive: change <= 0 // Less spending is positive
		};
	}
</script>

<svelte:head>
	<title>Analytics - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<PageHeader title="Analytics" subtitle="Insights into your activities and habits" />

	{#if !analytics}
		<EmptyState
			icon="fa-chart-bar"
			message="No data yet"
			submessage="Start using the app to see analytics"
		/>
	{:else}
		<!-- Training Stats -->
		<div class="mb-8">
			<h2
				class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-accent uppercase"
			>
				<i class="fas fa-dumbbell text-xs text-blue-500"></i>
				Training
			</h2>
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					icon="fa-calendar-check"
					iconColor="text-blue-500"
					value={analytics.training.totalSessions}
					label="Total Sessions"
				/>
				<StatCard
					icon="fa-clock"
					iconColor="text-blue-500"
					value={formatDuration(analytics.training.totalDuration)}
					label="Total Time"
				/>
				<StatCard
					icon="fa-fire"
					iconColor="text-blue-500"
					value={analytics.training.thisWeekSessions}
					label="This Week"
				/>
				<StatCard
					icon="fa-chart-line"
					iconColor="text-blue-500"
					value={formatDuration(analytics.training.avgDuration)}
					label="Avg Duration"
				/>
			</div>
		</div>

		<!-- Spending Stats -->
		<div class="mb-8">
			<h2
				class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-accent uppercase"
			>
				<i class="fas fa-receipt text-xs text-warning"></i>
				Spending
			</h2>
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-wallet text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">
						{analytics.spending.thisMonthTotal.toLocaleString()}
						<span class="text-xs font-normal text-fg-subdued">{currency}</span>
					</p>
					<p class="text-xs text-fg-subdued">This Month</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-calendar text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">
						{analytics.spending.lastMonthTotal.toLocaleString()}
						<span class="text-xs font-normal text-fg-subdued">{currency}</span>
					</p>
					<p class="text-xs text-fg-subdued">Last Month</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-chart-pie text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">
						{analytics.spending.avgDaily.toLocaleString()}
						<span class="text-xs font-normal text-fg-subdued">{currency}</span>
					</p>
					<p class="text-xs text-fg-subdued">Daily Average</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-tag text-sm text-warning"></i>
					</div>
					<p class="truncate text-sm font-semibold text-fg">
						{analytics.spending.topExpenseDescription || 'N/A'}
					</p>
					<p class="text-xs text-fg-subdued">Top Expense</p>
				</div>
			</div>
			{#if getSpendingTrend()}
				{@const trend = getSpendingTrend()}
				<div class="mt-3 flex items-center gap-2 text-xs">
					<i class="fas {trend?.positive ? 'fa-arrow-down text-success' : 'fa-arrow-up text-error'}"
					></i>
					<span class={trend?.positive ? 'text-success' : 'text-error'}>
						{trend?.value}% {trend?.positive ? 'less' : 'more'} than last month
					</span>
				</div>
			{/if}
		</div>

		<!-- Habit Stats -->
		<div class="mb-8">
			<h2
				class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-accent uppercase"
			>
				<i class="fas fa-bell text-xs text-primary"></i>
				Habits & Reminders
			</h2>
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					icon="fa-tasks"
					iconColor="text-primary"
					value={analytics.habits.totalReminders}
					label="Total (30 days)"
				/>
				<StatCard
					icon="fa-check-circle"
					iconColor="text-success"
					value="{analytics.habits.completionRate}%"
					label="Completion Rate"
				/>
				<StatCard
					icon="fa-fire"
					iconColor="text-orange-500"
					value={analytics.habits.currentStreak}
					label="Current Streak"
				/>
				<StatCard
					icon="fa-trophy"
					iconColor="text-orange-500"
					value={analytics.habits.bestStreak}
					label="Best Streak"
				/>
			</div>
		</div>

		<!-- Productivity Stats -->
		<div class="mb-8">
			<h2
				class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-accent uppercase"
			>
				<i class="fas fa-cubes text-xs text-purple-500"></i>
				Productivity
			</h2>
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<StatCard
					icon="fa-cube"
					iconColor="text-purple-500"
					value={analytics.products.totalItems}
					label="Total Items"
				/>
				<StatCard
					icon="fa-plus"
					iconColor="text-purple-500"
					value={analytics.products.itemsThisWeek}
					label="New This Week"
				/>
				<StatCard
					icon="fa-file-alt"
					iconColor="text-purple-500"
					value={analytics.products.totalPages}
					label="Total Pages"
				/>
			</div>
		</div>

		<!-- Quick Links -->
		<div class="flex flex-wrap gap-3">
			<Button href="/app/training" variant="secondary">
				<i class="fas fa-dumbbell text-xs text-blue-500"></i>
				Training
			</Button>
			<Button href="/app/finance" variant="secondary">
				<i class="fas fa-receipt text-xs text-warning"></i>
				Finance
			</Button>
			<Button href="/app/reminders" variant="secondary">
				<i class="fas fa-bell text-xs text-primary"></i>
				Reminders
			</Button>
			<Button href="/app/calendar" variant="secondary">
				<i class="fas fa-calendar text-xs text-green-500"></i>
				Calendar
			</Button>
		</div>
	{/if}
</div>
