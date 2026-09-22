<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		value = $bindable(''),
		label = undefined,
		name = undefined,
		id = undefined,
		disabled = false,
		error = undefined,
		size = 'md',
		onchange = undefined,
		class: className = '',
		children,
		...rest
	}: {
		value?: string;
		label?: string;
		name?: string;
		id?: string;
		disabled?: boolean;
		error?: string;
		size?: 'sm' | 'md';
		onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
		class?: string;
		children: Snippet;
	} & Record<string, unknown> = $props();

	const sizes: Record<string, string> = {
		sm: 'h-8 px-2 text-xs',
		md: 'h-[36px] px-3 text-sm'
	};
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={id ?? name} class="text-xs font-semibold tracking-wide text-fg-accent">
			{label}
		</label>
	{/if}
	<select
		{name}
		{id}
		{disabled}
		{onchange}
		bind:value
		{...rest}
		class="{sizes[
			size
		]} w-full rounded-sm border border-border bg-bg text-fg transition-colors hover:border-fg-subdued focus:border-primary focus:ring-0 focus:outline-none {error
			? 'border-error'
			: ''} {disabled ? 'cursor-not-allowed opacity-40' : ''}"
	>
		{@render children()}
	</select>
	{#if error}
		<p class="text-xs text-error">{error}</p>
	{/if}
</div>
