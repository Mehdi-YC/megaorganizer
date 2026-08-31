<script lang="ts">
	let { value = $bindable(''), placeholder = 'Search...', onsearch }: { value?: string; placeholder?: string; onsearch?: () => void } = $props();
</script>

<div class="relative">
	<i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fg-subdued pointer-events-none"></i>
	<input
		type="search"
		{placeholder}
		bind:value
		oninput={() => onsearch?.()}
		onkeydown={(e) => { if (e.key === 'Enter') onsearch?.(); }}
		class="h-9 w-full rounded-sm border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
	/>
</div>
