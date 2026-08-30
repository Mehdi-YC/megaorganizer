<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		rows = 4,
		label = undefined,
		name = undefined
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		rows?: number;
		label?: string;
		name?: string;
	} = $props();
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={name} class="text-xs font-semibold text-fg-accent tracking-wide">
			{label}
		</label>
	{/if}
	<textarea
		{name}
		{placeholder}
		{disabled}
		{rows}
		bind:value
		class="rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none {disabled
			? 'opacity-40 cursor-not-allowed'
			: ''}"
	></textarea>
</div>
