<script lang="ts">
	let {
		total = 0,
		count = 0,
		limit = null,
		currency = 'DZD',
		year,
		month
	}: {
		total?: number;
		count?: number;
		limit?: number | null;
		currency?: string;
		year: number;
		month: number;
	} = $props();

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	let percentage = $derived(limit && limit > 0 ? Math.min((total / limit) * 100, 100) : 0);
	let remaining = $derived(limit ? Math.max(limit - total, 0) : null);
	let isOverLimit = $derived(limit ? total > limit : false);

	function getProgressColor(): string {
		if (percentage >= 90) return 'bg-error';
		if (percentage >= 70) return 'bg-warning';
		return 'bg-success';
	}
</script>

<div class="rounded-sm border border-border bg-surface p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">
			{monthNames[month]} {year}
		</h3>
		<span class="text-[10px] text-fg-subdued">{count} expense{count !== 1 ? 's' : ''}</span>
	</div>

	<div class="space-y-3">
		<!-- Total spent -->
		<div>
			<p class="text-2xl font-semibold text-fg">
				{total.toLocaleString()} <span class="text-sm font-normal text-fg-subdued">{currency}</span>
			</p>
		</div>

		<!-- Limit progress -->
		{#if limit}
			<div>
				<div class="flex items-center justify-between mb-1">
					<span class="text-[10px] text-fg-subdued">
						{isOverLimit ? 'Over limit!' : 'of'} {limit.toLocaleString()} {currency}
					</span>
					<span class="text-[10px] font-medium {isOverLimit ? 'text-error' : 'text-fg-subdued'}">
						{percentage.toFixed(0)}%
					</span>
				</div>
				<div class="h-2 rounded-full bg-muted overflow-hidden">
					<div
						class="h-full rounded-full transition-all {getProgressColor()}"
						style="width: {percentage}%"
					></div>
				</div>
				{#if remaining !== null && !isOverLimit}
					<p class="mt-1 text-[10px] text-fg-subdued">
						{remaining.toLocaleString()} {currency} remaining
					</p>
				{:else if isOverLimit}
					<p class="mt-1 text-[10px] text-error">
						{(total - limit).toLocaleString()} {currency} over budget
					</p>
				{/if}
			</div>
		{:else}
			<p class="text-[10px] text-fg-subdued">No spending limit set</p>
		{/if}

		<!-- Daily average -->
		<div class="pt-2 border-t border-border">
			<div class="flex items-center justify-between">
				<span class="text-[10px] text-fg-subdued">Daily average</span>
				<span class="text-xs font-medium text-fg">
					{count > 0 ? (total / new Date(year, month + 1, 0).getDate()).toFixed(0) : 0} {currency}
				</span>
			</div>
		</div>
	</div>
</div>
