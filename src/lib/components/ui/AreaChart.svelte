<script lang="ts">
	let {
		title,
		data,
		xLabels,
		yTicks,
		path,
		area,
		color = 'var(--color-primary)',
		chartWidth = 600,
		chartHeight = 200,
		padding = { top: 20, right: 20, bottom: 30, left: 50 },
		yFormat = (v: number) => String(v)
	}: {
		title: string;
		data: { value: number }[];
		xLabels: string[];
		yTicks: number[];
		path: string;
		area: string;
		color?: string;
		chartWidth?: number;
		chartHeight?: number;
		padding?: { top: number; right: number; bottom: number; left: number };
		yFormat?: (v: number) => string;
	} = $props();

	let chartW = $derived(chartWidth - padding.left - padding.right);
	let chartH = $derived(chartHeight - padding.top - padding.bottom);
	let maxValue = $derived(Math.max(...yTicks, 1));
</script>

<div class="mb-6 rounded-sm border border-border bg-surface p-5">
	<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide mb-4">{title}</h2>
	<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-auto">
		<g transform="translate({padding.left}, {padding.top})">
			{#each yTicks as tick}
				{@const y = chartH - (tick / maxValue) * chartH}
				<line x1="-5" y1={y} x2={chartW} y2={y} stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="3,3" />
				<text x="-8" y={y + 3} text-anchor="end" class="fill-fg-subdued" font-size="9">{yFormat(tick)}</text>
			{/each}
			<path d={area} fill={color} opacity="0.1" />
			<path d={path} fill="none" stroke={color} stroke-width="2" />
			{#each data as d, i}
				{@const x = i * (chartW / (data.length - 1 || 1))}
				{@const y = chartH - (d.value / maxValue) * chartH}
				<circle cx={x} cy={y} r="3" fill={color} />
				<text x={x} y={chartH + 15} text-anchor="middle" class="fill-fg-subdued" font-size="9">{xLabels[i]}</text>
			{/each}
			<line x1="0" y1="0" x2="0" y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
			<line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--color-border)" stroke-width="0.5" />
		</g>
	</svg>
</div>
