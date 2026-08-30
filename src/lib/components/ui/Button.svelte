<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 cursor-pointer';

	const variants: Record<string, string> = {
		primary: 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]',
		secondary: 'bg-muted text-fg border border-border hover:border-fg-subdued hover:text-fg-accent active:scale-[0.98]',
		ghost: 'text-fg-subdued hover:text-fg hover:bg-muted active:scale-[0.98]',
		danger: 'bg-error text-white hover:bg-red-600 active:scale-[0.98]'
	};

	const sizes: Record<string, string> = {
		sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',
		md: 'h-[36px] px-4 text-sm gap-2 rounded-sm',
		lg: 'h-[42px] px-6 text-sm gap-2 rounded-sm'
	};
</script>

<button
	{type}
	{disabled}
	class="{base} {variants[variant]} {sizes[size]}"
	{onclick}
>
	{@render children()}
</button>
