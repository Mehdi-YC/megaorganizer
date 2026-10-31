<script lang="ts">
	import type { Expense } from '$lib/types';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Badge } from '$lib/components/ui';

	let {
		expense,
		currency = 'DZD',
		onEdit,
		onDelete
	}: {
		expense: Expense;
		currency?: string;
		onEdit?: (expense: Expense) => void;
		onDelete?: (id: string) => void;
	} = $props();

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

<div
	class="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-border-strong hover:shadow-sm"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="text-sm font-bold tracking-tight text-fg">
					{expense.amount.toLocaleString()}
					{expense.currency || currency}
				</span>
				<span class="text-xs text-fg-subdued">{formatDate(expense.spentAt)}</span>
			</div>
			{#if expense.description}
				<p class="mt-0.5 truncate text-xs text-fg-subdued">{expense.description}</p>
			{/if}
			{#if tags.length > 0}
				<div class="mt-2 flex flex-wrap gap-1">
					{#each tags as tag (tag)}
						<Badge variant="default" size="sm">{tag}</Badge>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1.5">
			{#if onEdit}
				<button
					type="button"
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={() => onEdit(expense)}
					title="Edit"
					aria-label="Edit"
				>
					<i class="fas fa-pen text-xs"></i>
				</button>
			{/if}
			{#if onDelete}
				<button
					type="button"
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-error"
					onclick={() => onDelete(expense.id)}
					title="Delete"
					aria-label="Delete"
				>
					<i class="fas fa-trash text-xs"></i>
				</button>
			{/if}
		</div>
	</div>

	{#if expense.markdown}
		<div class="mt-3 border-t border-border/50 pt-2.5">
			<div class="markdown-content text-xs leading-relaxed text-fg">{@html renderedMarkdown}</div>
		</div>
	{/if}
</div>
