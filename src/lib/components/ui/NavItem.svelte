<script lang="ts">
	let {
		active = false,
		href = '#',
		icon = undefined,
		children,
		onclick
	}: {
		active?: boolean;
		href?: string;
		icon?: string;
		children: string;
		onclick?: (e: MouseEvent) => void;
	} = $props();
</script>

{#if href}
	<a
		{href}
		class="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors {active
			? 'bg-primary/10 text-primary'
			: 'text-fg hover:bg-muted'}"
	>
		{#if icon}
			<i class="fas {icon} w-4"></i>
		{/if}
		{children}
	</a>
{:else}
	<button
		type="button"
		class="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors {active
			? 'bg-primary/10 text-primary'
			: 'text-fg hover:bg-muted'}"
		{onclick}
	>
		{#if icon}
			<i class="fas {icon} w-4"></i>
		{/if}
		{children}
	</button>
{/if}
