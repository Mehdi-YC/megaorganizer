<script lang="ts">
	const uid = $props.id();

	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		disabled = false,
		error = undefined,
		label = undefined,
		name = undefined,
		id = uid,
		size = 'md',
		min = undefined,
		max = undefined,
		step = undefined,
		oninput = undefined,
		onchange = undefined,
		class: className = '',
		...rest
	}: {
		value?: string | number;
		placeholder?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'date' | 'time';
		disabled?: boolean;
		error?: string;
		label?: string;
		name?: string;
		id?: string;
		size?: 'sm' | 'md';
		min?: number;
		max?: number;
		step?: number;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		class?: string;
	} & Record<string, unknown> = $props();

	const sizes: Record<string, string> = {
		sm: 'h-8 px-2 text-base sm:text-xs',
		md: 'h-[36px] px-3 text-base sm:text-sm'
	};
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={id} class="text-xs font-semibold tracking-wide text-fg-accent">
			{label}
		</label>
	{/if}
	<input
		{id}
		{type}
		{name}
		{placeholder}
		{disabled}
		{min}
		{max}
		{step}
		{oninput}
		{onchange}
		bind:value
		{...rest}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
		class="{sizes[
			size
		]} w-full rounded-sm border border-border-strong bg-bg text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary-text {error
			? 'border-error'
			: ''} {disabled ? 'cursor-not-allowed opacity-40' : ''}"
	/>
	{#if error}
		<p id="{id}-error" class="text-xs text-error">{error}</p>
	{/if}
</div>
