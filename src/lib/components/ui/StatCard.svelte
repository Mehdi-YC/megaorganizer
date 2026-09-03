<script lang="ts">
	let {
		icon,
		iconColor = 'text-primary',
		value,
		label
	}: {
		icon: string;
		iconColor?: string;
		value: string | number;
		label: string;
	} = $props();
</script>

<div class="rounded-sm border border-border bg-surface p-6">
	<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
		<i class="fas {icon} {iconColor}"></i>
	</div>
	<p class="text-2xl font-semibold text-fg">{value}</p>
	<p class="text-sm text-fg-subdued">{label}</p>
</div>
