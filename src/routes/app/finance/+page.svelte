<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { EmptyState } from '$lib/components/ui';
	import { ExpenseForm, ExpenseCard, MonthlySummary } from '$lib/components/finance';

	let { data } = $props();
	let expenses = $derived<any[]>(data.expenses ?? []);
	let monthlyStats = $derived(data.monthlyStats ?? { total: 0, count: 0 });
	let settings = $derived<any>(data.settings ?? { currency: 'DZD', currencyRate: 1, monthlySpendingLimit: null });
	let year = $derived(data.year ?? new Date().getFullYear());
	let month = $derived(data.month ?? new Date().getMonth());

	let currentMonth = $state(new Date());

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
		loadMonthData();
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
		loadMonthData();
	}

	async function loadMonthData() {
		// This would ideally reload data for the selected month
		// For now, we'll use the server-loaded data
	}

	async function handleAddExpense(expenseData: any) {
		const res = await fetch('/api/finance', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createExpense', ...expenseData })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function handleDeleteExpense(id: string) {
		if (!confirm('Delete this expense?')) return;

		const res = await fetch('/api/finance', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteExpense', expenseId: id })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
</script>

<svelte:head>
	<title>Finance - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-fg-accent">Finance</h1>
		<p class="mt-1 text-sm text-fg-subdued">Track your expenses and spending</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Add Expense Form -->
			<ExpenseForm
				currency={settings.currency}
				onSave={handleAddExpense}
			/>

			<!-- Expense List -->
			<div>
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">
						Expenses
					</h2>
					<span class="text-xs text-fg-subdued">
						{monthNames[month]} {year}
					</span>
				</div>

				{#if expenses.length === 0}
					<EmptyState
						icon="fa-receipt"
						message="No expenses this month"
						submessage="Add your first expense above"
					/>
				{:else}
					<div class="space-y-2">
						{#each expenses as expense}
							<ExpenseCard
								{expense}
								currency={settings.currency}
								onDelete={handleDeleteExpense}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Monthly Summary -->
			<MonthlySummary
				total={monthlyStats.total}
				count={monthlyStats.count}
				limit={settings.monthlySpendingLimit}
				currency={settings.currency}
				{year}
				{month}
			/>

			<!-- Quick Stats -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Quick Stats</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-xs text-fg-subdued">This month</span>
						<span class="text-sm font-medium text-fg">
							{monthlyStats.total.toLocaleString()} {settings.currency}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-xs text-fg-subdued">Transactions</span>
						<span class="text-sm font-medium text-fg">{monthlyStats.count}</span>
					</div>
					{#if monthlyStats.count > 0}
						<div class="flex items-center justify-between">
							<span class="text-xs text-fg-subdued">Avg per expense</span>
							<span class="text-sm font-medium text-fg">
								{(monthlyStats.total / monthlyStats.count).toFixed(0)} {settings.currency}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Link to Calendar -->
			<a
				href="/app/calendar?filter=finance"
				class="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50"
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
					<i class="fas fa-calendar text-sm text-primary"></i>
				</div>
				<div>
					<p class="text-sm font-medium text-fg">View in Calendar</p>
					<p class="text-[10px] text-fg-subdued">See expenses on calendar</p>
				</div>
			</a>
		</div>
	</div>
</div>
