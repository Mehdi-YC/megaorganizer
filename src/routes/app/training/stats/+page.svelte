<script lang="ts">
	let { data } = $props();

	let sessions = $derived(data.sessions ?? []);
	let runningData = $derived(data.runningData ?? []);

	const chartWidth = 600;
	const chartHeight = 200;
	const padding = { top: 20, right: 20, bottom: 30, left: 50 };

	function formatDuration(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return h > 0 ? `${h}h ${m}m` : `${m}m`;
	}

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
		return runningData
			.map((r) => ({
				label: new Date(r.startedAt).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
				distance: (r.distance ?? 0) / 1000,
				pace: r.averagePace ?? 0
			}));
	}

	function buildSvgPath(data: number[], width: number, height: number, minY: number, maxY: number) {
		if (data.length === 0) return '';
		const range = maxY - minY || 1;
		const stepX = width / (data.length - 1 || 1);
		return data.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - minY) / range) * height;
			return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
		}).join(' ');
	}

	function buildSvgArea(data: number[], width: number, height: number, minY: number, maxY: number) {
		if (data.length === 0) return '';
		const range = maxY - minY || 1;
		const stepX = width / (data.length - 1 || 1);
		const points = data.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - minY) / range) * height;
			return `${x},${y}`;
		});
		return `M 0 ${height} L ${points.join(' L ')} L ${(data.length - 1) * stepX} ${height} Z`;
	}

	function getYTicks(maxValue: number, count = 4): number[] {
		if (maxValue <= 0) return [0];
		const step = maxValue / count;
		const ticks = [];
		for (let i = 0; i <= count; i++) {
			ticks.push(Math.round(step * i));
		}
		return ticks;
	}

	let weeklyData = $derived(getWeeklyData());
	let monthlyData = $derived(getMonthlyData());
	let runningDistanceData = $derived(getRunningDistanceData());

	let chartW = $derived(chartWidth - padding.left - padding.right);
	let chartH = $derived(chartHeight - padding.top - padding.bottom);

	let weeklyMaxDur = $derived(Math.max(...weeklyData.map((d) => d.duration / 60), 1));
	let weeklyYTicks = $derived(getYTicks(weeklyMaxDur));

	let monthlyMaxDur = $derived(Math.max(...monthlyData.map((d) => d.duration / 60), 1));
	let monthlyYTicks = $derived(getYTicks(monthlyMaxDur));

	let runningMaxDist = $derived(Math.max(...runningDistanceData.map((d) => d.distance), 1));
	let runningYTicks = $derived(getYTicks(runningMaxDist));

	let weeklyDurationPath = $derived(buildSvgPath(
		weeklyData.map((d) => d.duration / 60),
		chartW,
		chartH,
		0,
		weeklyMaxDur
	));
	let weeklyDurationArea = $derived(buildSvgArea(
		weeklyData.map((d) => d.duration / 60),
		chartW,
		chartH,
		0,
		weeklyMaxDur
	));

	let monthlyDurationPath = $derived(buildSvgPath(
		monthlyData.map((d) => d.duration / 60),
		chartW,
		chartH,
		0,
		monthlyMaxDur
	));
	let monthlyDurationArea = $derived(buildSvgArea(
		monthlyData.map((d) => d.duration / 60),
		chartW,
		chartH,
		0,
		monthlyMaxDur
	));

	let runningPath = $derived(buildSvgPath(
		runningDistanceData.map((d) => d.distance),
		chartW,
		chartH,
		0,
		runningMaxDist
	));
	let runningArea = $derived(buildSvgArea(
		runningDistanceData.map((d) => d.distance),
		chartW,
		chartH,
		0,
		runningMaxDist
	));
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
		<div class="rounded-sm border border-dashed border-border py-16 text-center">
			<i class="fas fa-chart-line mb-3 text-3xl text-fg-subdued/30"></i>
			<p class="text-sm text-fg-subdued">No completed sessions yet</p>
			<a href="/app/training/session/new" class="mt-3 inline-block text-xs text-primary hover:text-primary-hover">Start your first session</a>
		</div>
	{:else}
		<!-- Weekly Training Duration -->
		<div class="mb-6 rounded-sm border border-border bg-surface p-5">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide mb-4">Weekly Training (minutes)</h2>
			<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-auto">
				<g transform="translate({padding.left}, {padding.top})">
					{#each weeklyYTicks as tick}
						{@const y = chartH - (tick / weeklyMaxDur) * chartH}
						<line x1="-5" y1={y} x2={chartW} y2={y} stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="3,3" />
						<text x="-8" y={y + 3} text-anchor="end" class="fill-fg-subdued" font-size="9">{tick}</text>
					{/each}
					<path d={weeklyDurationArea} fill="var(--color-primary)" opacity="0.1" />
					<path d={weeklyDurationPath} fill="none" stroke="var(--color-primary)" stroke-width="2" />
					{#each weeklyData as d, i}
						{@const x = i * (chartW / (weeklyData.length - 1 || 1))}
						{@const y = chartH - (d.duration / 60 / weeklyMaxDur) * chartH}
						<circle cx={x} cy={y} r="3" fill="var(--color-primary)" />
						<text x={x} y={chartH + 15} text-anchor="middle" class="fill-fg-subdued" font-size="9">{d.label}</text>
					{/each}
					<line x1="0" y1="0" x2="0" y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
					<line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
				</g>
			</svg>
		</div>

		<!-- Monthly Training Duration -->
		<div class="mb-6 rounded-sm border border-border bg-surface p-5">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide mb-4">Monthly Training (minutes)</h2>
			<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-auto">
				<g transform="translate({padding.left}, {padding.top})">
					{#each monthlyYTicks as tick}
						{@const y = chartH - (tick / monthlyMaxDur) * chartH}
						<line x1="-5" y1={y} x2={chartW} y2={y} stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="3,3" />
						<text x="-8" y={y + 3} text-anchor="end" class="fill-fg-subdued" font-size="9">{tick}</text>
					{/each}
					<path d={monthlyDurationArea} fill="#10b981" opacity="0.1" />
					<path d={monthlyDurationPath} fill="none" stroke="#10b981" stroke-width="2" />
					{#each monthlyData as d, i}
						{@const x = i * (chartW / (monthlyData.length - 1 || 1))}
						{@const y = chartH - (d.duration / 60 / monthlyMaxDur) * chartH}
						<circle cx={x} cy={y} r="3" fill="#10b981" />
						<text x={x} y={chartH + 15} text-anchor="middle" class="fill-fg-subdued" font-size="9">{d.label}</text>
					{/each}
					<line x1="0" y1="0" x2="0" y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
					<line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
				</g>
			</svg>
		</div>

		<!-- Running Distance Over Time -->
		{#if runningDistanceData.length > 0}
			<div class="mb-6 rounded-sm border border-border bg-surface p-5">
				<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide mb-4">Running Distance (km)</h2>
				<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-auto">
					<g transform="translate({padding.left}, {padding.top})">
						{#each runningYTicks as tick}
							{@const y = chartH - (tick / runningMaxDist) * chartH}
							<line x1="-5" y1={y} x2={chartW} y2={y} stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="3,3" />
							<text x="-8" y={y + 3} text-anchor="end" class="fill-fg-subdued" font-size="9">{tick.toFixed(1)}</text>
						{/each}
						<path d={runningArea} fill="#f59e0b" opacity="0.1" />
						<path d={runningPath} fill="none" stroke="#f59e0b" stroke-width="2" />
						{#each runningDistanceData as d, i}
							{@const x = i * (chartW / (runningDistanceData.length - 1 || 1))}
							{@const y = chartH - (d.distance / runningMaxDist) * chartH}
							<circle cx={x} cy={y} r="3" fill="#f59e0b" />
							<text x={x} y={chartH + 15} text-anchor="middle" class="fill-fg-subdued" font-size="9">{d.label}</text>
						{/each}
						<line x1="0" y1="0" x2="0" y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
						<line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
					</g>
				</svg>
			</div>
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
