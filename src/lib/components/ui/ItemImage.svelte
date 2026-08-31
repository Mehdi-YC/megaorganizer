<script lang="ts">
	import { isSmallImage } from '$lib/utils';
	import { onMount } from 'svelte';

	let { src, alt = '', size = 'md' }: { src: string; alt?: string; size?: 'sm' | 'md' | 'lg' | 'full' } = $props();

	let small = $state(false);

	const sizes = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-16 w-16' };

	onMount(async () => {
		if (src) small = await isSmallImage(src);
	});
</script>

{#if size === 'full'}
	{#if small}
		<div class="relative h-full w-full overflow-hidden">
			<img {src} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
			<img {src} {alt} class="relative h-full w-full object-contain p-0.5" />
		</div>
	{:else}
		<img {src} {alt} class="h-full w-full object-cover" />
	{/if}
{:else}
	{#if small}
		<div class="relative {sizes[size]} shrink-0 overflow-hidden rounded">
			<img {src} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
			<img {src} {alt} class="relative h-full w-full object-contain" />
		</div>
	{:else}
		<img {src} {alt} class="{sizes[size]} rounded object-cover shrink-0" />
	{/if}
{/if}
