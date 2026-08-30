<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		label = undefined
	}: {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
	} = $props();
</script>

<label class="inline-flex items-center gap-2 cursor-pointer {disabled ? 'opacity-50 cursor-not-allowed' : ''}">
	<input
		type="checkbox"
		bind:checked
		{disabled}
		class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
	/>
	{#if label}
		<span class="text-sm text-fg">{label}</span>
	{/if}
</label>
