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
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
		class?: string;
	} & Record<string, unknown> = $props();

	const base =
		'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1';

	const variants: Record<string, string> = {
		primary: 'bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-[0.98]',
		secondary:
			'bg-surface text-fg border border-border hover:bg-muted/70 hover:border-border-strong active:scale-[0.98] shadow-xs',
		outline: 'border border-border bg-transparent text-fg hover:bg-muted/60 active:scale-[0.98]',
		ghost: 'text-fg-subdued hover:text-fg hover:bg-muted/70 active:scale-[0.98]',
		danger: 'bg-error text-white hover:bg-error/90 active:scale-[0.98] shadow-xs'
	};

	const sizes: Record<string, string> = {
		xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-md',
		sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
		md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
		lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
		icon: 'h-9 w-9 p-0 rounded-lg'
	};

	let inert = $derived(disabled || loading);
</script>

{#if href}
	<!-- Callers pass an already-resolved path, or an external/asset URL that
	     resolve() does not apply to (downloads, outbound links). The rule
	     reports on the href attribute, not the element, so this needs a block. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		class="{base} {variants[variant] ?? variants.primary} {sizes[size] ??
			sizes.md} {className} {inert ? 'pointer-events-none opacity-40' : ''}"
		{...rest}
		{onclick}
	>
		{#if loading}<Spinner size="sm" />{/if}
		{@render children()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		{type}
		disabled={inert}
		class="{base} {variants[variant] ?? variants.primary} {sizes[size] ?? sizes.md} {className}"
		{...rest}
		{onclick}
	>
		{#if loading}<Spinner size="sm" />{/if}
		{@render children()}
	</button>
{/if}
