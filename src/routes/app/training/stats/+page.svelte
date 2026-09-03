<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import AreaChart from '$lib/components/ui/AreaChart.svelte';

	let { data } = $props();

	let sessions = $derived(data.sessions ?? []);
	let runningData = $derived(data.runningData ?? []);

	function getWeeklyData() {
		const now = new Date();
		const weeks: { label: string; count: number; duration: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - (i * 7 + now.getDay()));
			weekStart.setHours(0, 0, 0, 0);
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 7);
			const weekSessions = sessions.filter((s) => {
				const d = new Date(s.startedAt);
				return d >= weekStart && d < weekEnd;
			});
			weeks.push({
				label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
				count: weekSessions.length,
				duration: weekSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)
			});
		}
		return weeks;
	}

	function getMonthlyData() {
		const now = new Date();
		const months: { label: string; count: number; duration: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
			const monthSessions = sessions.filter((s) => {
				const d = new Date(s.startedAt);
				return d >= monthDate && d <= monthEnd;
			});
			months.push({
				label: monthDate.toLocaleString('default', { month: 'short' }),
				count: monthSessions.length,
				duration: monthSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)
			});
		}
		return months;
	}

	function getRunningDistanceData() {
		if (runningData.length === 0) return [];
		return runningData.map((r) => ({
			label: new Date(r.startedAt).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
			distance: (r.distance ?? 0) / 1000,
			pace: r.averagePace ?? 0
		}));
	}

	function buildSvgPath(values: number[], width: number, height: number, minY: number, maxY: number) {
		if (values.length === 0) return '';
		const range = maxY - minY || 1;
		const stepX = width / (values.length - 1 || 1);
		return values.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - minY) / range) * height;
			return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
		}).join(' ');
	}

	function buildSvgArea(values: number[], width: number, height: number, minY: number, maxY: number) {
		if (values.length === 0) return '';
		const range = maxY - minY || 1;
		const stepX = width / (values.length - 1 || 1);
		const points = values.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - minY) / range) * height;
			return `${x},${y}`;
		});
		return `M 0 ${height} L ${points.join(' L ')} L ${(values.length - 1) * stepX} ${height} Z`;
	}

	function getYTicks(maxValue: number, count = 4): number[] {
		if (maxValue <= 0) return [0];
		const step = maxValue / count;
		return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
	}

	function formatMinutes(v: number) { return String(v); }
	function formatKm(v: number) { return v.toFixed(1); }

	let weeklyData = $derived(getWeeklyData());
	let monthlyData = $derived(getMonthlyData());
	let runningDistanceData = $derived(getRunningDistanceData());

	let weeklyChart = $derived((() => {
		const values = weeklyData.map((d) => d.duration / 60);
		const max = Math.max(...values, 1);
		return { values, max, ticks: getYTicks(max), path: buildSvgPath(values, 530, 150, 0, max), area: buildSvgArea(values, 530, 150, 0, max) };
	})());

	let monthlyChart = $derived((() => {
		const values = monthlyData.map((d) => d.duration / 60);
		const max = Math.max(...values, 1);
		return { values, max, ticks: getYTicks(max), path: buildSvgPath(values, 530, 150, 0, max), area: buildSvgArea(values, 530, 150, 0, max) };
	})());

	let runningChart = $derived((() => {
		const values = runningDistanceData.map((d) => d.distance);
		const max = Math.max(...values, 1);
		return { values, max, ticks: getYTicks(max), path: buildSvgPath(values, 530, 150, 0, max), area: buildSvgArea(values, 530, 150, 0, max) };
	})());
</script>

<svelte:head>
	<title>Training Stats - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8 max-w-5xl">
	<div class="mb-6">
		<a href="/app/training" class="text-sm text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left mr-1"></i> Back to Training
		</a>
	</div>

	<h1 class="text-lg font-semibold text-fg-accent mb-6">Training Stats</h1>

	{#if sessions.length === 0}
		<EmptyState icon="fa-chart-line" message="No completed sessions yet" submessage="Start your first session to see stats" />
	{:else}
		<AreaChart
			title="Weekly Training (minutes)"
			data={weeklyData.map((d) => ({ value: d.duration / 60 }))}
			xLabels={weeklyData.map((d) => d.label)}
			yTicks={weeklyChart.ticks}
			path={weeklyChart.path}
			area={weeklyChart.area}
			yFormat={formatMinutes}
		/>

		<AreaChart
			title="Monthly Training (minutes)"
			data={monthlyData.map((d) => ({ value: d.duration / 60 }))}
			xLabels={monthlyData.map((d) => d.label)}
			yTicks={monthlyChart.ticks}
			path={monthlyChart.path}
			area={monthlyChart.area}
			color="#10b981"
			yFormat={formatMinutes}
		/>

		{#if runningDistanceData.length > 0}
			<AreaChart
				title="Running Distance (km)"
				data={runningDistanceData.map((d) => ({ value: d.distance }))}
				xLabels={runningDistanceData.map((d) => d.label)}
				yTicks={runningChart.ticks}
				path={runningChart.path}
				area={runningChart.area}
				color="#f59e0b"
				yFormat={formatKm}
			/>
		{/if}

		<!-- Session Type Breakdown -->
		<div class="rounded-sm border border-border bg-surface p-5">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide mb-4">Session Types</h2>
			{#if sessions.length > 0}
				{@const typeCounts = sessions.reduce((acc, s) => {
					const types = (s as any).activityTypes ?? ['other'];
					for (const t of types) { acc[t] = (acc[t] ?? 0) + 1; }
					return acc;
				}, {} as Record<string, number>)}
				{@const total = sessions.length}
				<div class="space-y-2">
					{#each Object.entries(typeCounts).sort((a, b) => b[1] - a[1]) as [type, count]}
						{@const pct = Math.round((count / total) * 100)}
						<div class="flex items-center gap-3">
							<span class="w-20 text-xs text-fg-subdued capitalize">{type}</span>
							<div class="flex-1 h-5 rounded-sm bg-muted overflow-hidden">
								<div class="h-full rounded-sm bg-primary transition-all" style="width: {pct}%"></div>
							</div>
							<span class="w-12 text-right text-xs text-fg">{count}</span>
							<span class="w-10 text-right text-[10px] text-fg-subdued">{pct}%</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
