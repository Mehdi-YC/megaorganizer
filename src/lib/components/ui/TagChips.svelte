<script lang="ts">
	let { tags, size = 'sm' }: { tags: any[]; size?: 'xs' | 'sm' } = $props();
	const sizeClasses = { xs: 'px-1 py-0.5 text-[9px]', sm: 'px-1.5 py-0.5 text-[10px]' };
</script>

{#each tags as t}
	<span class="rounded-sm font-medium text-white {sizeClasses[size]}" style="background: {t.color || '#5A31F4'}">{t.name}</span>
{/each}
