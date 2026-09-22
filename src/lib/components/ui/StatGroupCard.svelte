<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon,
		title,
		stats = [],
		footer
	}: {
		icon: string;
		title: string;
		stats: Array<{ label: string; value: string | number }>;
		footer?: Snippet;
	} = $props();
</script>

<div class="flex flex-col rounded-sm border border-border bg-surface p-4">
	<div class="mb-3 flex items-center gap-2">
		<i class="fas {icon} w-4 text-center text-xs text-fg-subdued"></i>
		<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">{title}</h3>
	</div>
	<div class="grid grid-cols-2 gap-x-4 gap-y-3">
		{#each stats as stat (stat.label)}
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold text-fg">{stat.value}</p>
				<p class="truncate text-[10px] text-fg-subdued">{stat.label}</p>
			</div>
		{/each}
	</div>
	{#if footer}
		<div class="mt-3 border-t border-border/50 pt-2">
			{@render footer()}
		</div>
	{/if}
</div>
