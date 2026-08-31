<script lang="ts">
	let { tagIds = [], allTags = [], editing = false, onToggle }: {
		tagIds?: string[];
		allTags?: Array<{ id: string; name: string; color?: string }>;
		editing?: boolean;
		onToggle?: (tagId: string) => void;
	} = $props();

	let showPicker = $state(false);
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
</script>

<div>
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Tags</h3>
		{#if editing}
			<button type="button" class="text-[10px] text-primary hover:text-primary-hover" onclick={() => (showPicker = !showPicker)}>
				{showPicker ? 'Done' : 'Edit'}
			</button>
		{/if}
	</div>

	{#if showPicker && editing}
		<div class="mb-3 space-y-1 max-h-40 overflow-y-auto">
			{#each allTags as t}
				<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted {tagIds.includes(t.id) ? 'bg-muted' : ''}" onclick={() => onToggle?.(t.id)}>
					<div class="h-3 w-3 shrink-0 rounded-full" style="background: {t.color || '#5A31F4'}"></div>
					<span class="flex-1 text-fg">{t.name}</span>
					{#if tagIds.includes(t.id)}<i class="fas fa-check text-[9px] text-primary"></i>{/if}
				</button>
			{:else}
				<p class="text-[11px] text-fg-subdued italic">No tags. Create some in <a href="/app/tags" class="text-primary hover:text-primary-hover">Tags</a> page.</p>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap gap-1">
		{#each assignedTags as t}
			<span class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white" style="background: {t.color || '#5A31F4'}">{t.name}</span>
		{:else}
			<p class="text-[11px] text-fg-subdued">{editing ? 'No tags assigned' : 'No tags'}</p>
		{/each}
	</div>
</div>
