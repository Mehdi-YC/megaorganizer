<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		disabled = false,
		error = undefined,
		label = undefined,
		name = undefined
	}: {
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
		disabled?: boolean;
		error?: string;
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
	<input
		{type}
		{name}
		{placeholder}
		{disabled}
		bind:value
		class="h-[36px] rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0 {error
			? 'border-error'
			: ''} {disabled ? 'opacity-40 cursor-not-allowed' : ''}"
	/>
	{#if error}
		<p class="text-xs text-error">{error}</p>
	{/if}
</div>
