<script lang="ts">
	import { SMALL_IMAGE_THRESHOLD } from '$lib/utils';

	let {
		src,
		alt = '',
		height = 'h-20',
		icon = 'fa-cube'
	}: { src?: string | null; alt?: string; height?: string; icon?: string } = $props();

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

{#if src}
	<div class="{height} w-full overflow-hidden">
		<div class="relative h-full w-full">
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
				class="relative h-full w-full {small ? 'object-contain p-0.5' : 'object-cover'}"
			/>
		</div>
	</div>
{:else}
	<div class="flex {height} w-full items-center justify-center bg-muted">
		<i class="fas {icon} text-xs text-fg-subdued"></i>
	</div>
{/if}
