<script lang="ts">
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { invalidateAll } from '$app/navigation';
	import { EmptyState } from '$lib/components/ui';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import { ExpenseForm, ExpenseCard, MonthlySummary } from '$lib/components/finance';

	let { data } = $props();
	let expenses = $derived<any[]>(data.expenses ?? []);
	let monthlyStats = $derived(data.monthlyStats ?? { total: 0, count: 0 });
	let settings = $derived<any>(
		data.settings ?? { currency: 'DZD', currencyRate: 1, monthlySpendingLimit: null }
	);
	let year = $derived(data.year ?? new Date().getFullYear());
	let month = $derived(data.month ?? new Date().getMonth());

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
		if (!(await confirmAction('Delete this expense?'))) return;

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
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
</script>

<svelte:head>
	<title>Finance - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<PageHeader title="Finance" subtitle="Track your expenses and spending" />

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Add Expense Form -->
			<ExpenseForm currency={settings.currency} onSave={handleAddExpense} />

			<!-- Expense List -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-sm font-semibold tracking-wide text-fg-accent uppercase">Expenses</h2>
					<span class="text-xs text-fg-subdued">
						{monthNames[month]}
						{year}
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
						{#each expenses as expense (expense.id)}
							<ExpenseCard {expense} currency={settings.currency} onDelete={handleDeleteExpense} />
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
				<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Quick Stats
				</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-xs text-fg-subdued">This month</span>
						<span class="text-sm font-medium text-fg">
							{monthlyStats.total.toLocaleString()}
							{settings.currency}
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
								{(monthlyStats.total / monthlyStats.count).toFixed(0)}
								{settings.currency}
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
