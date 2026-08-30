<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		trigger,
		children,
		align = 'start'
	}: {
		open?: boolean;
		trigger: Snippet;
		children: Snippet;
		align?: 'start' | 'center' | 'end';
	} = $props();

	let dropdownEl: HTMLDivElement;

	function handleClickOutside(e: MouseEvent) {
		if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={handleClickOutside} on:keydown={handleKeydown} />

<div class="relative inline-block" bind:this={dropdownEl}>
	<div onclick={() => (open = !open)} onkeydown={(e) => e.key === 'Enter' && (open = !open)} role="button" tabindex="0">
		{@render trigger()}
	</div>

	{#if open}
		<div
			class="absolute z-50 mt-1 min-w-[160px] rounded-sm border border-border bg-white py-1 shadow-md animate-slide-in
				{align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'}"
		>
			{@render children()}
		</div>
	{/if}
</div>
