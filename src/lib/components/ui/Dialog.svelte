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

	function handlePanelClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function trapFocus(e: FocusEvent) {
		const backdrop = e.currentTarget as HTMLElement;
		if (backdrop.contains(e.relatedTarget as Node | null)) return;
		const focusable = backdrop.querySelector<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		focusable?.focus();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay animate-fade-in p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		onfocusin={trapFocus}
		role="presentation"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="animate-scale-in max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-sm border border-border bg-surface shadow-2xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby={title ? 'dialog-title' : undefined}
			onclick={handlePanelClick}
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
