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
		<label for={id} class="text-xs font-medium text-fg">
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
		class="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-xs transition-all placeholder:text-fg-subdued/70 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none {error
			? 'border-error ring-1 ring-error/30'
			: ''} {disabled ? 'cursor-not-allowed opacity-50' : ''}"></textarea>
	{#if error}
		<p id="{id}-error" class="text-xs text-error">{error}</p>
	{/if}
</div>
