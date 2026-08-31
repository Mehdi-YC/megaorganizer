<script lang="ts">
	import { isSmallImage } from '$lib/utils';
	import { onMount } from 'svelte';

	let { src, alt = '', height = 'h-20', icon = 'fa-cube' }: { src?: string; alt?: string; height?: string; icon?: string } = $props();

	let small = $state(false);

	onMount(async () => {
		if (src) small = await isSmallImage(src);
	});
</script>

{#if src}
	<div class="{height} w-full overflow-hidden rounded-sm">
		{#if small}
			<div class="relative h-full w-full">
				<img {src} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
				<img {src} {alt} class="relative h-full w-full object-contain p-0.5" />
			</div>
		{:else}
			<img {src} {alt} class="h-full w-full object-cover" />
		{/if}
	</div>
{:else}
	<div class="flex {height} w-full items-center justify-center rounded-sm bg-muted">
		<i class="fas {icon} text-xs text-fg-subdued"></i>
	</div>
{/if}
