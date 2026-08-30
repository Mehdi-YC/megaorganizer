<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		size = 'md',
		children
	}: {
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
		size?: 'sm' | 'md';
		children: Snippet;
	} = $props();

	const variants: Record<string, string> = {
		default: 'bg-muted text-fg-subdued',
		primary: 'bg-primary-subdued text-primary',
		success: 'bg-green-500/15 text-success',
		warning: 'bg-warning/15 text-warning',
		danger: 'bg-error/15 text-error'
	};

	const sizes: Record<string, string> = {
		sm: 'px-1.5 py-0.5 text-[10px]',
		md: 'px-2 py-0.5 text-xs'
	};
</script>

<span class="inline-flex items-center font-semibold rounded-sm tracking-wide uppercase {variants[variant]} {sizes[size]}">
	{@render children()}
</span>
