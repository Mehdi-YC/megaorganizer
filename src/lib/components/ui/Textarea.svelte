<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		rows = 4,
		label = undefined,
		name = undefined,
		error = undefined,
		class: className = '',
		...rest
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		rows?: number;
		label?: string;
		name?: string;
		error?: string;
		class?: string;
	} & Record<string, unknown> = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={name} class="text-xs font-semibold tracking-wide text-fg-accent">
			{label}
		</label>
	{/if}
	<textarea
		{name}
		{placeholder}
		{disabled}
		{rows}
		bind:value
		{...rest}
		class="resize-none rounded-sm border border-border bg-bg px-3 py-2.5 text-base text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary sm:text-sm {error
			? 'border-error'
			: ''} {disabled ? 'cursor-not-allowed opacity-40' : ''}"></textarea>
	{#if error}
		<p class="text-xs text-error">{error}</p>
	{/if}
</div>
