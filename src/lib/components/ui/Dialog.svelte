<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	let {
		open = $bindable(false),
		title = undefined,
		description = undefined,
		children,
		footer = undefined,
		onclose
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	} = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) handleClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="presentation"
	>
		<div
			class="animate-scale-in w-full max-w-md rounded-sm border border-border bg-surface shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'dialog-title' : undefined}
		>
			{#if title}
				<div class="border-b border-border px-6 py-4">
					<h2 id="dialog-title" class="text-base font-semibold text-fg-accent">
						{title}
					</h2>
					{#if description}
						<p class="mt-1 text-xs text-fg-subdued">{description}</p>
					{/if}
				</div>
			{/if}

			<div class="px-6 py-5">
				{@render children()}
			</div>

			<div class="flex justify-end gap-2 border-t border-border px-6 py-3">
				{#if footer}
					{@render footer()}
				{:else}
					<Button variant="secondary" onclick={handleClose}>Close</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
