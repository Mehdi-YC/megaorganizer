<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		onsearch,
		autofocus = false,
		class: className = ''
	}: {
		value?: string;
		placeholder?: string;
		onsearch?: () => void;
		autofocus?: boolean;
		class?: string;
	} = $props();
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autofocus && inputEl) {
			inputEl.focus();
		}
	});
</script>

<div class="relative {className}">
	<i
		class="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-fg-subdued"
	></i>
	<input
		type="search"
		{placeholder}
		bind:this={inputEl}
		bind:value
		oninput={() => onsearch?.()}
		onkeydown={(e) => {
			if (e.key === 'Enter') onsearch?.();
		}}
		class="h-9 w-full rounded-sm border border-border bg-bg pr-3 pl-9 text-base text-fg placeholder:text-fg-subdued focus:border-primary focus:ring-0 focus:outline-none sm:text-sm"
	/>
</div>
