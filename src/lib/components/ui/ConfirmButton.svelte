<script lang="ts">
	let { confirmId, targetId, icon = 'fa-trash', size = 'sm', onconfirm }: { confirmId: string; targetId: string; icon?: string; size?: 'sm' | 'xs'; onconfirm: () => void } = $props();
	const sizeClasses = { sm: 'h-8 w-8', xs: 'h-5 w-5' };
	const iconSizes = { sm: 'text-xs', xs: 'text-[9px]' };
</script>

{#if confirmId === targetId}
	<button type="button" class="inline-flex {sizeClasses[size]} items-center justify-center rounded-sm bg-error/20 text-error hover:bg-error/30" onclick={(e) => { e.stopPropagation(); onconfirm(); }} aria-label="Confirm">
		<i class="fas fa-check {iconSizes[size]}"></i>
	</button>
{:else}
	<button type="button" class="inline-flex {sizeClasses[size]} items-center justify-center rounded-sm text-fg-subdued hover:text-error hover:bg-error/10" onclick={(e) => { e.stopPropagation(); onconfirm(); }} aria-label="Delete">
		<i class="fas {icon} {iconSizes[size]}"></i>
	</button>
{/if}
