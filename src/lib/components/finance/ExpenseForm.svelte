<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	export interface ExpenseDraft {
		amount: number;
		description?: string;
		markdown?: string;
		tags?: string[];
		spentAt: string;
		currency: string;
	}

	let {
		currency = 'DZD',
		title = 'Add Expense',
		flat = false,
		initialValues,
		onSave,
		onCancel
	}: {
		currency?: string;
		title?: string;
		flat?: boolean;
		initialValues?: {
			amount: number;
			description?: string;
			markdown?: string;
			tags?: string[];
			spentAt?: string;
		};
		onSave?: (data: ExpenseDraft) => void;
		onCancel?: () => void;
	} = $props();

	const draft = untrack(() => initialValues);

	let amount = $state<number>(draft?.amount ?? 0);
	let description = $state(draft?.description ?? '');
	let markdown = $state(draft?.markdown ?? '');
	let tags = $state<string[]>(draft?.tags ?? []);
	let newTag = $state('');
	let spentAt = $state(draft?.spentAt ?? new Date().toISOString().split('T')[0]);
	let showContent = $state(!!draft?.markdown);

	function addTag() {
		if (newTag.trim() && !tags.includes(newTag.trim())) {
			tags = [...tags, newTag.trim()];
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	export function submit() {
		handleSave();
	}

	export function reset() {
		amount = draft?.amount ?? 0;
		description = draft?.description ?? '';
		markdown = draft?.markdown ?? '';
		tags = draft?.tags ?? [];
		newTag = '';
		spentAt = draft?.spentAt ?? new Date().toISOString().split('T')[0];
		showContent = !!draft?.markdown;
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
	}
</script>

<div class={flat ? '' : 'rounded-sm border border-border bg-surface p-4'}>
	<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">{title}</h3>

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
							class="cursor-pointer hover:text-primary-hover"
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
