<script lang="ts">
	let {
		size = 'md',
		class: className = ''
	}: {
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizes: Record<string, string> = {
		sm: 'h-4 w-4 border-2',
		md: 'h-6 w-6 border-2',
		lg: 'h-12 w-12 border-4'
	};
</script>

<div
	class="animate-spin rounded-full border-primary border-t-transparent {sizes[size]} {className}"
	role="status"
	aria-label="Loading"
></div>
