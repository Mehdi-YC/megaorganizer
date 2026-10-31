<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		descriptionOnHover = true,
		badge = undefined,
		children
	}: {
		title: string;
		subtitle?: string;
		descriptionOnHover?: boolean;
		badge?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
	<div class="min-w-0">
		<div class="flex items-center gap-3">
			<h1
				class="text-2xl font-bold tracking-tight text-fg {subtitle ? 'cursor-help' : ''}"
				title={subtitle}
			>
				{title}
			</h1>
			{#if badge}
				<span
					class="rounded-full bg-primary-subdued px-2.5 py-0.5 text-xs font-medium text-primary-text"
				>
					{badge}
				</span>
			{/if}
		</div>
		{#if subtitle && !descriptionOnHover}
			<p class="mt-1 hidden text-sm text-fg-subdued sm:block">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		<div class="no-scrollbar flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
			{@render children()}
		</div>
	{/if}
</div>
