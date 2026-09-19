<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';

	let {
		currency = 'DZD',
		onSave,
		onCancel
	}: {
		currency?: string;
		onSave?: (data: any) => void;
		onCancel?: () => void;
	} = $props();

	let amount = $state<number>(0);
	let description = $state('');
	let markdown = $state('');
	let tags = $state<string[]>([]);
	let newTag = $state('');
	let spentAt = $state(new Date().toISOString().split('T')[0]);
	let showContent = $state(false);

	function addTag() {
		if (newTag.trim() && !tags.includes(newTag.trim())) {
			tags = [...tags, newTag.trim()];
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function handleSave() {
		if (amount <= 0) return;

		onSave?.({
			amount,
			description: description.trim() || undefined,
			markdown: markdown.trim() || undefined,
			tags: tags.length > 0 ? tags : undefined,
			spentAt: new Date(spentAt).toISOString(),
			currency
		});

		// Reset form
		amount = 0;
		description = '';
		markdown = '';
		tags = [];
		spentAt = new Date().toISOString().split('T')[0];
		showContent = false;
	}
</script>

<div class="rounded-sm border border-border bg-surface p-4">
	<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Add Expense</h3>

	<div class="space-y-3">
		<!-- Amount and Date row -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="expense-amount" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">
					AMOUNT ({currency})
				</label>
				<input
					type="number"
					id="expense-amount"
					bind:value={amount}
					min="0"
					step="0.01"
					placeholder="0.00"
					class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
				/>
			</div>
			<div>
				<label for="expense-date" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">
					DATE
				</label>
				<input
					type="date"
					id="expense-date"
					bind:value={spentAt}
					class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
				/>
			</div>
		</div>

		<!-- Description -->
		<div>
			<label for="expense-desc" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">
				DESCRIPTION
			</label>
			<input
				type="text"
				id="expense-desc"
				bind:value={description}
				placeholder="What was this expense for?"
				class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
			/>
		</div>

		<!-- Tags -->
		<div>
			<span class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">TAGS</span>
			<div class="flex flex-wrap gap-1.5 mb-2">
				{#each tags as tag}
					<span class="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
						{tag}
						<button type="button" class="hover:text-primary-hover" onclick={() => removeTag(tag)} aria-label="Remove tag {tag}">
							<i class="fas fa-times text-[8px]"></i>
						</button>
					</span>
				{/each}
			</div>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newTag}
					placeholder="Add tag..."
					class="flex-1 h-[32px] rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
					onkeydown={(e) => e.key === 'Enter' && addTag()}
				/>
				<button
					type="button"
					class="inline-flex h-[32px] items-center justify-center rounded-sm bg-muted px-3 text-xs font-medium text-fg border border-border hover:border-fg-subdued"
					onclick={addTag}
					aria-label="Add tag"
				>
					<i class="fas fa-plus text-[10px]"></i>
				</button>
			</div>
		</div>

		<!-- Toggle markdown content -->
		<button
			type="button"
			class="text-xs text-primary hover:text-primary-hover"
			onclick={() => (showContent = !showContent)}
		>
			{showContent ? 'Hide' : 'Add'} notes
		</button>

		{#if showContent}
			<div>
				<textarea
					bind:value={markdown}
					placeholder="Additional notes (markdown supported)..."
					rows="3"
					class="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none resize-none"
				></textarea>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end gap-2">
			{#if onCancel}
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg border border-border hover:border-fg-subdued"
					onclick={onCancel}
				>
					Cancel
				</button>
			{/if}
			<button
				type="button"
				class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={handleSave}
				disabled={amount <= 0}
			>
				<i class="fas fa-plus mr-2 text-xs"></i>
				Add Expense
			</button>
		</div>
	</div>
</div>
