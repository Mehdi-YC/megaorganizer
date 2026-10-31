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
		sm: 'h-8 px-2.5 text-xs rounded-md',
		md: 'h-9 px-3 text-sm rounded-lg'
	};
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={id} class="text-xs font-medium text-fg">
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
		]} w-full border border-border bg-surface text-fg shadow-xs transition-all placeholder:text-fg-subdued/70 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none {error
			? 'border-error ring-1 ring-error/30'
			: ''} {disabled ? 'cursor-not-allowed opacity-50' : ''}"
	/>
	{#if error}
		<p id="{id}-error" class="text-xs text-error">{error}</p>
	{/if}
</div>
