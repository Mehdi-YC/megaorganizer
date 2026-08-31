<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, subtitle, children }: { title: string; subtitle?: string; children?: Snippet } = $props();
</script>

<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
	<div>
		<h1 class="text-xl font-bold text-fg-accent">{title}</h1>
		{#if subtitle}
			<p class="text-sm text-fg-subdued">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		<div class="flex items-center gap-2">
			{@render children()}
		</div>
	{/if}
</div>
