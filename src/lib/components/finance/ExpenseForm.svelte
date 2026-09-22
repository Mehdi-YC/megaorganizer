<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

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
	<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">Add Expense</h3>

	<div class="space-y-3">
		<!-- Amount and Date row -->
		<div class="grid grid-cols-2 gap-3">
			<Input
				type="number"
				name="expense-amount"
				label="AMOUNT ({currency})"
				bind:value={amount}
				min={0}
				step={0.01}
				placeholder="0.00"
			/>
			<Input type="date" name="expense-date" label="DATE" bind:value={spentAt} />
		</div>

		<!-- Description -->
		<Input
			name="expense-desc"
			label="DESCRIPTION"
			bind:value={description}
			placeholder="What was this expense for?"
		/>

		<!-- Tags -->
		<div>
			<span class="mb-1.5 block text-[10px] font-semibold tracking-wide text-fg-subdued">TAGS</span>
			<div class="mb-2 flex flex-wrap gap-1.5">
				{#each tags as tag (tag)}
					<span
						class="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
					>
						{tag}
						<button
							type="button"
							class="hover:text-primary-hover"
							onclick={() => removeTag(tag)}
							aria-label="Remove tag {tag}"
						>
							<i class="fas fa-times text-[8px]"></i>
						</button>
					</span>
				{/each}
			</div>
			<div class="flex gap-2">
				<Input
					size="sm"
					class="flex-1"
					bind:value={newTag}
					placeholder="Add tag..."
					onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && addTag()}
				/>
				<button
					type="button"
					class="inline-flex h-[32px] w-8 cursor-pointer items-center justify-center rounded-sm border border-border bg-muted px-3 text-xs font-medium text-fg hover:border-fg-subdued"
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
			class="cursor-pointer text-xs text-primary hover:text-primary-hover"
			onclick={() => (showContent = !showContent)}
		>
			{showContent ? 'Hide' : 'Add'} notes
		</button>

		{#if showContent}
			<Textarea
				bind:value={markdown}
				placeholder="Additional notes (markdown supported)..."
				rows={3}
			/>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end gap-2">
			{#if onCancel}
				<Button variant="secondary" onclick={onCancel}>Cancel</Button>
			{/if}
			<Button onclick={handleSave} disabled={amount <= 0}>
				<i class="fas fa-plus mr-2 text-xs"></i>
				Add Expense
			</Button>
		</div>
	</div>
</div>
