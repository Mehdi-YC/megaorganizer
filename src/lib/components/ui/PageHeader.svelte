<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		descriptionOnHover = false,
		children
	}: {
		title: string;
		subtitle?: string;
		descriptionOnHover?: boolean;
		children?: Snippet;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
	<div class="min-w-0">
		<h1
			class="text-xl font-bold text-fg-accent {descriptionOnHover && subtitle ? 'cursor-help' : ''}"
			title={subtitle}
		>
			{title}
		</h1>
		{#if subtitle && !descriptionOnHover}
			<p class="text-sm text-fg-subdued">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		<div class="flex items-center gap-2">
			{@render children()}
		</div>
	{/if}
</div>
