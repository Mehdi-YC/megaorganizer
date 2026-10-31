<script lang="ts">
	let {
		items,
		active = $bindable(),
		onchange = undefined,
		size = 'md',
		class: className = ''
	}: {
		items: { id: string; label: string; count?: number; icon?: string }[];
		active: string;
		onchange?: (id: string) => void;
		size?: 'sm' | 'md';
		class?: string;
	} = $props();

	function select(id: string) {
		active = id;
		onchange?.(id);
	}
</script>

<div
	class="inline-flex items-center rounded-xl border border-border/50 bg-muted/60 p-1 text-fg-subdued select-none {className}"
	role="tablist"
>
	{#each items as item (item.id)}
		<button
			type="button"
			role="tab"
			aria-selected={active === item.id}
			onclick={() => select(item.id)}
			class="relative inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none {size ===
			'sm'
				? 'px-2.5 py-1 text-xs'
				: 'px-3.5 py-1.5 text-xs sm:text-sm'} {active === item.id
				? 'bg-surface font-semibold text-fg shadow-xs'
				: 'text-fg-subdued hover:bg-muted/40 hover:text-fg'}"
		>
			{#if item.icon}
				<i class="{item.icon} text-xs"></i>
			{/if}
			<span>{item.label}</span>
			{#if item.count !== undefined}
				<span
					class="py-0.2 rounded-full px-1.5 text-[10px] font-semibold {active === item.id
						? 'bg-primary-subdued text-primary-text'
						: 'bg-muted text-fg-subdued'}"
				>
					{item.count}
				</span>
			{/if}
		</button>
	{/each}
</div>
