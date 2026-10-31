<script lang="ts">
	import type { Snippet } from 'svelte';

	const uid = $props.id();

	let {
		value = $bindable(''),
		label = undefined,
		name = undefined,
		id = uid,
		disabled = false,
		error = undefined,
		size = 'md',
		onchange = undefined,
		class: className = '',
		children,
		...rest
	}: {
		value?: string | number;
		label?: string;
		name?: string;
		id?: string;
		disabled?: boolean;
		error?: string;
		size?: 'sm' | 'md';
		onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
		class?: string;
		children: Snippet;
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
	<div class="relative">
		<select
			{name}
			{id}
			{disabled}
			{onchange}
			bind:value
			{...rest}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			class="{sizes[
				size
			]} w-full appearance-none border border-border bg-surface pr-8 pl-3 text-fg shadow-xs transition-all hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none {error
				? 'border-error ring-1 ring-error/30'
				: ''} {disabled ? 'cursor-not-allowed opacity-50' : ''}"
		>
			{@render children()}
		</select>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-fg-subdued"
		>
			<i class="fas fa-chevron-down text-xs"></i>
		</div>
	</div>
	{#if error}
		<p id="{id}-error" class="text-xs text-error">{error}</p>
	{/if}
</div>
