<script lang="ts">
	const uid = $props.id();

	let {
		checked = $bindable(false),
		disabled = false,
		label = undefined,
		description = undefined,
		id = uid,
		onchange = undefined,
		class: className = ''
	}: {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		description?: string;
		id?: string;
		onchange?: (checked: boolean) => void;
		class?: string;
	} = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			toggle();
		}
	}
</script>

<div class="flex items-center gap-3 {className}">
	<button
		{id}
		type="button"
		role="switch"
		aria-label={label || 'Toggle switch'}
		aria-checked={checked}
		{disabled}
		onclick={toggle}
		onkeydown={handleKeydown}
		class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {checked
			? 'bg-primary'
			: 'border-border bg-muted'}"
	>
		<span
			aria-hidden="true"
			class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {checked
				? 'translate-x-5'
				: 'translate-x-0'}"
		></span>
	</button>
	{#if label || description}
		<div class="flex flex-col text-left">
			{#if label}
				<label for={id} class="cursor-pointer text-sm font-medium text-fg">
					{label}
				</label>
			{/if}
			{#if description}
				<span class="text-xs text-fg-subdued">{description}</span>
			{/if}
		</div>
	{/if}
</div>
