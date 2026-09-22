<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		label = undefined,
		onchange = undefined
	}: {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		onchange?: (checked: boolean) => void;
	} = $props();
</script>

<label
	class="inline-flex cursor-pointer items-center gap-2 {disabled
		? 'cursor-not-allowed opacity-50'
		: ''}"
>
	<input
		type="checkbox"
		bind:checked
		{disabled}
		onchange={(e) => onchange?.(e.currentTarget.checked)}
		class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
	/>
	{#if label}
		<span class="text-sm text-fg">{label}</span>
	{/if}
</label>
