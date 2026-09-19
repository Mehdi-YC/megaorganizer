<script lang="ts">
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
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-fg-accent">Analytics</h1>
		<p class="mt-1 text-sm text-fg-subdued">Insights into your activities and habits</p>
	</div>

	{#if !analytics}
		<div class="rounded-sm border border-dashed border-border py-16 text-center">
			<i class="fas fa-chart-bar mb-3 text-3xl text-fg-subdued/30"></i>
			<p class="text-sm text-fg-subdued">No data yet</p>
			<p class="mt-1 text-xs text-fg-subdued">Start using the app to see analytics</p>
		</div>
	{:else}
		<!-- Training Stats -->
		<div class="mb-8">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide mb-4 flex items-center gap-2">
				<i class="fas fa-dumbbell text-xs text-blue-500"></i>
				Training
			</h2>
			<div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-blue-500/10">
						<i class="fas fa-calendar-check text-sm text-blue-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.training.totalSessions}</p>
					<p class="text-xs text-fg-subdued">Total Sessions</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-blue-500/10">
						<i class="fas fa-clock text-sm text-blue-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{formatDuration(analytics.training.totalDuration)}</p>
					<p class="text-xs text-fg-subdued">Total Time</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-blue-500/10">
						<i class="fas fa-fire text-sm text-blue-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.training.thisWeekSessions}</p>
					<p class="text-xs text-fg-subdued">This Week</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-blue-500/10">
						<i class="fas fa-chart-line text-sm text-blue-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{formatDuration(analytics.training.avgDuration)}</p>
					<p class="text-xs text-fg-subdued">Avg Duration</p>
				</div>
			</div>
		</div>

		<!-- Spending Stats -->
		<div class="mb-8">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide mb-4 flex items-center gap-2">
				<i class="fas fa-receipt text-xs text-warning"></i>
				Spending
			</h2>
			<div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-wallet text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.spending.thisMonthTotal.toLocaleString()} <span class="text-xs font-normal text-fg-subdued">{currency}</span></p>
					<p class="text-xs text-fg-subdued">This Month</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-calendar text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.spending.lastMonthTotal.toLocaleString()} <span class="text-xs font-normal text-fg-subdued">{currency}</span></p>
					<p class="text-xs text-fg-subdued">Last Month</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-chart-pie text-sm text-warning"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.spending.avgDaily.toLocaleString()} <span class="text-xs font-normal text-fg-subdued">{currency}</span></p>
					<p class="text-xs text-fg-subdued">Daily Average</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-warning/10">
						<i class="fas fa-tag text-sm text-warning"></i>
					</div>
					<p class="text-sm font-semibold text-fg truncate">{analytics.spending.topExpenseDescription || 'N/A'}</p>
					<p class="text-xs text-fg-subdued">Top Expense</p>
				</div>
			</div>
			{#if getSpendingTrend()}
				{@const trend = getSpendingTrend()}
				<div class="mt-3 flex items-center gap-2 text-xs">
					<i class="fas {trend?.positive ? 'fa-arrow-down text-success' : 'fa-arrow-up text-error'}"></i>
					<span class="{trend?.positive ? 'text-success' : 'text-error'}">
						{trend?.value}% {trend?.positive ? 'less' : 'more'} than last month
					</span>
				</div>
			{/if}
		</div>

		<!-- Habit Stats -->
		<div class="mb-8">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide mb-4 flex items-center gap-2">
				<i class="fas fa-bell text-xs text-primary"></i>
				Habits & Reminders
			</h2>
			<div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
						<i class="fas fa-tasks text-sm text-primary"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.habits.totalReminders}</p>
					<p class="text-xs text-fg-subdued">Total (30 days)</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-success/10">
						<i class="fas fa-check-circle text-sm text-success"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.habits.completionRate}%</p>
					<p class="text-xs text-fg-subdued">Completion Rate</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-orange-500/10">
						<i class="fas fa-fire text-sm text-orange-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.habits.currentStreak}</p>
					<p class="text-xs text-fg-subdued">Current Streak</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-orange-500/10">
						<i class="fas fa-trophy text-sm text-orange-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.habits.bestStreak}</p>
					<p class="text-xs text-fg-subdued">Best Streak</p>
				</div>
			</div>
		</div>

		<!-- Productivity Stats -->
		<div class="mb-8">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide mb-4 flex items-center gap-2">
				<i class="fas fa-cubes text-xs text-purple-500"></i>
				Productivity
			</h2>
			<div class="grid gap-3 grid-cols-2 lg:grid-cols-3">
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-purple-500/10">
						<i class="fas fa-cube text-sm text-purple-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.products.totalItems}</p>
					<p class="text-xs text-fg-subdued">Total Items</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-purple-500/10">
						<i class="fas fa-plus text-sm text-purple-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.products.itemsThisWeek}</p>
					<p class="text-xs text-fg-subdued">New This Week</p>
				</div>
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-purple-500/10">
						<i class="fas fa-file-alt text-sm text-purple-500"></i>
					</div>
					<p class="text-xl font-semibold text-fg">{analytics.products.totalPages}</p>
					<p class="text-xs text-fg-subdued">Total Pages</p>
				</div>
			</div>
		</div>

		<!-- Quick Links -->
		<div class="flex flex-wrap gap-3">
			<a href="/app/training" class="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm text-fg hover:border-primary/50 transition-colors">
				<i class="fas fa-dumbbell text-xs text-blue-500"></i>
				Training
			</a>
			<a href="/app/finance" class="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm text-fg hover:border-primary/50 transition-colors">
				<i class="fas fa-receipt text-xs text-warning"></i>
				Finance
			</a>
			<a href="/app/reminders" class="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm text-fg hover:border-primary/50 transition-colors">
				<i class="fas fa-bell text-xs text-primary"></i>
				Reminders
			</a>
			<a href="/app/calendar" class="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm text-fg hover:border-primary/50 transition-colors">
				<i class="fas fa-calendar text-xs text-green-500"></i>
				Calendar
			</a>
		</div>
	{/if}
</div>