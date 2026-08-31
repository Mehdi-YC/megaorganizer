<script lang="ts">
	let { icon = 'fa-inbox', message, submessage }: { icon?: string; message: string; submessage?: string } = $props();
</script>

<div class="rounded-sm border border-border bg-surface py-16 text-center">
	<i class="fas {icon} mb-3 text-3xl text-fg-subdued"></i>
	<p class="text-sm text-fg-subdued">{message}</p>
	{#if submessage}
		<p class="mt-1 text-xs text-fg-subdued">{submessage}</p>
	{/if}
</div>
