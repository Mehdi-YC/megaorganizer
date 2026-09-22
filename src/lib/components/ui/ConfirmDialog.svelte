<script lang="ts">
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import { confirmState, resolveConfirm } from '$lib/utils/confirm.svelte';

	function handleConfirm() {
		resolveConfirm(true);
	}

	function handleCancel() {
		resolveConfirm(false);
	}
</script>

<Dialog bind:open={confirmState.open} title="Are you sure?" onclose={handleCancel}>
	<p class="text-sm text-fg-subdued">{confirmState.message}</p>
	{#snippet footer()}
		<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
		<Button variant="danger" onclick={handleConfirm}>{confirmState.confirmLabel}</Button>
	{/snippet}
</Dialog>
