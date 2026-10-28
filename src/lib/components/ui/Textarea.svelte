<script lang="ts">
	const uid = $props.id();

	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		rows = 4,
		label = undefined,
		name = undefined,
		id = uid,
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
		id?: string;
		error?: string;
		class?: string;
	} & Record<string, unknown> = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={id} class="text-xs font-semibold tracking-wide text-fg-accent">
			{label}
		</label>
	{/if}
	<textarea
		{id}
		{name}
		{placeholder}
		{disabled}
		{rows}
		bind:value
		{...rest}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
		class="resize-none rounded-sm border border-border-strong bg-bg px-3 py-2.5 text-base text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary-text sm:text-sm {error
			? 'border-error'
			: ''} {disabled ? 'cursor-not-allowed opacity-40' : ''}"></textarea>
	{#if error}
		<p id="{id}-error" class="text-xs text-error">{error}</p>
	{/if}
</div>
