<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		size = 'md',
		children,
		class: className = ''
	}: {
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
		size?: 'sm' | 'md';
		children: Snippet;
		class?: string;
	} = $props();

	const variants: Record<string, string> = {
		default: 'bg-muted text-fg-subdued border-border/50',
		primary: 'bg-primary-subdued text-primary-text border-primary/20',
		success: 'bg-success/10 text-success border-success/25',
		warning: 'bg-warning/10 text-warning border-warning/25',
		danger: 'bg-error/10 text-error border-error/25',
		outline: 'bg-transparent text-fg-subdued border-border'
	};

	const sizes: Record<string, string> = {
		sm: 'px-2 py-0.5 text-[10px]',
		md: 'px-2.5 py-0.5 text-xs'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full border font-medium tracking-normal {variants[
		variant
	] ?? variants.default} {sizes[size] ?? sizes.md} {className}"
>
	{@render children()}
</span>
