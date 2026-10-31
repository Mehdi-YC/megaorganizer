<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon,
		title,
		stats = [],
		trend = undefined,
		footer,
		class: className = ''
	}: {
		icon: string;
		title: string;
		stats: Array<{ label: string; value: string | number; change?: string }>;
		trend?: { value: number; positive: boolean } | null;
		footer?: Snippet;
		class?: string;
	} = $props();
</script>

<div
	class="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:border-border-strong {className}"
>
	<div class="mb-4 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2.5">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/60 text-xs text-primary-text"
			>
				<i class="fas {icon}"></i>
			</div>
			<h3 class="text-xs font-semibold tracking-wider text-fg-subdued uppercase">
				{title}
			</h3>
		</div>
		{#if trend}
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium {trend.positive
					? 'bg-success/10 text-success'
					: 'bg-error/10 text-error'}"
			>
				<i class="fas {trend.positive ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]"></i>
				{Math.abs(trend.value)}%
			</span>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-4">
		{#each stats as stat (stat.label)}
			<div class="min-w-0">
				<p class="truncate text-xl font-bold tracking-tight text-fg">
					{stat.value}
				</p>
				<p class="mt-0.5 truncate text-xs text-fg-subdued">
					{stat.label}
				</p>
			</div>
		{/each}
	</div>

	{#if footer}
		<div class="mt-4 border-t border-border/60 pt-3">
			{@render footer()}
		</div>
	{/if}
</div>
