<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = undefined,
		description = undefined,
		children,
		onclose
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		children: Snippet;
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
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay animate-fade-in"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby={title ? 'dialog-title' : undefined}
	>
		<div class="w-full max-w-md rounded-sm border border-border bg-surface shadow-2xl animate-scale-in">
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

			<div class="border-t border-border px-6 py-3 flex justify-end">
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg transition-colors hover:bg-border"
					onclick={handleClose}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
