<script lang="ts">
	import type { Snippet } from 'svelte';
	import Spinner from './Spinner.svelte';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		href = undefined,
		onclick,
		children,
		class: className = '',
		...rest
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
		class?: string;
	} & Record<string, unknown> = $props();

	const base =
		'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 cursor-pointer touch-manipulation select-none';

	const variants: Record<string, string> = {
		primary: 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]',
		secondary:
			'bg-muted text-fg border border-border hover:border-fg-subdued hover:text-fg-accent active:scale-[0.98]',
		ghost: 'text-fg-subdued hover:text-fg hover:bg-muted active:scale-[0.98]',
		danger: 'bg-error text-white hover:bg-error/80 active:scale-[0.98]'
	};

	const sizes: Record<string, string> = {
		sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',
		md: 'h-[36px] px-4 text-sm gap-2 rounded-sm',
		lg: 'h-[42px] px-6 text-sm gap-2 rounded-sm'
	};

	let inert = $derived(disabled || loading);
</script>

{#if href}
	<a
		{href}
		class="{base} {variants[variant]} {sizes[size]} {className} {inert
			? 'pointer-events-none opacity-40'
			: ''}"
		{...rest}
		{onclick}
	>
		{#if loading}<Spinner size="sm" />{/if}
		{@render children()}
	</a>
{:else}
	<button
		{type}
		disabled={inert}
		class="{base} {variants[variant]} {sizes[size]} {className}"
		{...rest}
		{onclick}
	>
		{#if loading}<Spinner size="sm" />{/if}
		{@render children()}
	</button>
{/if}
