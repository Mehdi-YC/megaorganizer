<script lang="ts">
	import { SMALL_IMAGE_THRESHOLD } from '$lib/utils';

	let {
		src,
		alt = '',
		size = 'md'
	}: { src: string; alt?: string; size?: 'sm' | 'md' | 'lg' | 'full' } = $props();

	const sizes = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-16 w-16' };

	// Measured from the rendered image's natural size: no separate offscreen
	// probe, so each thumbnail is fetched and decoded once.
	let small = $state(false);
	let imgEl = $state<HTMLImageElement | null>(null);

	function measure() {
		if (!imgEl) return;
		small =
			imgEl.naturalWidth < SMALL_IMAGE_THRESHOLD.width ||
			imgEl.naturalHeight < SMALL_IMAGE_THRESHOLD.height;
	}
</script>

{#if size === 'full'}
	<div class="relative h-full w-full overflow-hidden rounded-xl">
		{#if small}
			<img
				{src}
				alt=""
				class="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl"
				loading="lazy"
				decoding="async"
			/>
		{/if}
		<img
			bind:this={imgEl}
			{src}
			{alt}
			onload={measure}
			loading="lazy"
			decoding="async"
			class="relative h-full w-full rounded-xl {small ? 'object-contain p-0.5' : 'object-cover'}"
		/>
	</div>
{:else}
	<div class="relative {sizes[size]} shrink-0 overflow-hidden rounded-xl">
		{#if small}
			<img
				{src}
				alt=""
				class="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl"
				loading="lazy"
				decoding="async"
			/>
		{/if}
		<img
			bind:this={imgEl}
			{src}
			{alt}
			onload={measure}
			loading="lazy"
			decoding="async"
			class="relative h-full w-full rounded-xl {small ? 'object-contain' : 'object-cover'}"
		/>
	</div>
{/if}
