<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		shortcut = '⌘K',
		onsearch,
		autofocus = false,
		class: className = '',
		inputEl = $bindable<HTMLInputElement | null>(null)
	}: {
		value?: string;
		placeholder?: string;
		shortcut?: string;
		onsearch?: () => void;
		autofocus?: boolean;
		class?: string;
		inputEl?: HTMLInputElement | null;
	} = $props();

	$effect(() => {
		if (autofocus && inputEl) {
			inputEl.focus();
		}
	});
</script>

<div class="relative flex items-center {className}">
	<i class="fas fa-search pointer-events-none absolute left-3 text-xs text-fg-subdued"></i>
	<input
		type="search"
		{placeholder}
		aria-label={placeholder}
		bind:this={inputEl}
		bind:value
		oninput={() => onsearch?.()}
		onkeydown={(e) => {
			if (e.key === 'Enter') onsearch?.();
		}}
		class="h-9 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm text-fg shadow-xs transition-all placeholder:text-fg-subdued/70 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
	/>
	{#if shortcut && !value}
		<kbd
			class="pointer-events-none absolute right-2.5 flex h-5 items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-fg-subdued select-none"
		>
			{shortcut}
		</kbd>
	{/if}
</div>
