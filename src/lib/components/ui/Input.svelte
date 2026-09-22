<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		disabled = false,
		error = undefined,
		label = undefined,
		name = undefined,
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
		type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
		disabled?: boolean;
		error?: string;
		label?: string;
		name?: string;
		size?: 'sm' | 'md';
		min?: number;
		max?: number;
		step?: number;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		class?: string;
	} & Record<string, unknown> = $props();

	const sizes: Record<string, string> = {
		sm: 'h-8 px-2 text-xs',
		md: 'h-[36px] px-3 text-sm'
	};
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={name} class="text-xs font-semibold tracking-wide text-fg-accent">
			{label}
		</label>
	{/if}
	<input
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
		class="{sizes[
			size
		]} w-full rounded-sm border border-border bg-bg text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary focus:ring-0 focus:outline-none {error
			? 'border-error'
			: ''} {disabled ? 'cursor-not-allowed opacity-40' : ''}"
	/>
	{#if error}
		<p class="text-xs text-error">{error}</p>
	{/if}
</div>
