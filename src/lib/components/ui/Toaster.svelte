<script lang="ts">
	import { dismissToast, toastState } from '$lib/utils/toast.svelte';

	const icons = {
		success: 'fa-circle-check',
		error: 'fa-circle-exclamation',
		info: 'fa-circle-info'
	} as const;

	const tones = {
		success: 'border-success/50 text-success',
		error: 'border-error/50 text-error',
		info: 'border-border-strong text-primary-text'
	} as const;
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toastState.items as toast (toast.id)}
		<div
			role={toast.variant === 'error' ? 'alert' : 'status'}
			class="animate-slide-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-sm border bg-surface px-4 py-3 shadow-2xl {tones[
				toast.variant
			]}"
		>
			<i class="fas {icons[toast.variant]} mt-0.5 text-sm" aria-hidden="true"></i>
			<p class="flex-1 text-sm leading-snug text-fg">{toast.message}</p>
			<button
				type="button"
				class="-mt-1 -mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				aria-label="Dismiss notification"
				onclick={() => dismissToast(toast.id)}
			>
				<i class="fas fa-times text-[10px]" aria-hidden="true"></i>
			</button>
		</div>
	{/each}
</div>
