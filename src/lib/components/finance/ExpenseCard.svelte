<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Badge } from '$lib/components/ui';

	let {
		expense,
		currency = 'DZD',
		onEdit,
		onDelete
	}: {
		expense: any;
		currency?: string;
		onEdit?: (expense: any) => void;
		onDelete?: (id: string) => void;
	} = $props();

	let showContent = $state(false);
	let renderedMarkdown = $state('');

	$effect(() => {
		if (expense.markdown) {
			renderMarkdown(expense.markdown).then((html) => {
				renderedMarkdown = html;
			});
		}
	});

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString([], {
			month: 'short',
			day: 'numeric'
		});
	}

	let tags: string[] = $derived(expense.tags ? JSON.parse(expense.tags) : []);
</script>

<div class="rounded-sm border border-border bg-surface p-3 transition-all hover:border-primary/30">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-fg">
					{expense.amount.toLocaleString()}
					{expense.currency || currency}
				</span>
				<span class="text-[10px] text-fg-subdued">{formatDate(expense.spentAt)}</span>
			</div>
			{#if expense.description}
				<p class="mt-0.5 truncate text-xs text-fg-subdued">{expense.description}</p>
			{/if}
			{#if tags.length > 0}
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each tags as tag (tag)}
						<Badge variant="default" size="sm">{tag}</Badge>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1">
			{#if expense.markdown}
				<button
					type="button"
					class="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm {showContent
						? 'bg-primary text-white'
						: 'bg-muted text-fg hover:bg-border'} transition-colors"
					onclick={() => (showContent = !showContent)}
					title="Show notes"
					aria-label="Show notes"
				>
					<i class="fas fa-expand text-[9px]"></i>
				</button>
			{/if}
			{#if onEdit}
				<button
					type="button"
					class="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-border"
					onclick={() => onEdit(expense)}
					title="Edit"
					aria-label="Edit"
				>
					<i class="fas fa-pen text-[9px]"></i>
				</button>
			{/if}
			{#if onDelete}
				<button
					type="button"
					class="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-error/10 hover:text-error"
					onclick={() => onDelete(expense.id)}
					title="Delete"
					aria-label="Delete"
				>
					<i class="fas fa-trash text-[9px]"></i>
				</button>
			{/if}
		</div>
	</div>

	{#if showContent && expense.markdown}
		<div class="mt-2 border-t border-border pt-2">
			<div class="markdown-content text-xs leading-relaxed text-fg">{@html renderedMarkdown}</div>
		</div>
	{/if}
</div>
