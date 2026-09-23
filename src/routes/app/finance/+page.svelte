<script lang="ts">
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { EmptyState } from '$lib/components/ui';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { ExpenseForm, ExpenseCard, MonthlySummary } from '$lib/components/finance';

	let { data } = $props();
	let expenses = $derived<any[]>(data.expenses ?? []);
	let monthlyStats = $derived(data.monthlyStats ?? { total: 0, count: 0 });
	let settings = $derived<any>(
		data.settings ?? { currency: 'DZD', currencyRate: 1, monthlySpendingLimit: null }
	);
	let year = $derived(data.year ?? new Date().getFullYear());
	let month = $derived(data.month ?? new Date().getMonth());

	// Add / edit dialog
	let showForm = $state(false);
	let editing = $state<any>(null);
	let saving = $state(false);
	let formError = $state('');

	// Search + tag filter over the loaded month
	let searchQuery = $state('');
	let activeTag = $state<string | null>(null);

	let allTags = $derived.by(() => {
		const set = new Set<string>();
		for (const e of expenses) {
			if (!e.tags) continue;
			try {
				for (const t of JSON.parse(e.tags)) set.add(t);
			} catch {
				// ignore malformed tags
			}
		}
		return [...set].sort();
	});

	let visibleExpenses = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return expenses.filter((e) => {
			if (activeTag) {
				let tags: string[] = [];
				try {
					tags = e.tags ? JSON.parse(e.tags) : [];
				} catch {
					// ignore malformed tags
				}
				if (!tags.includes(activeTag)) return false;
			}
			if (q) {
				const hay = `${e.description ?? ''} ${e.amount}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
	});

	function openAdd() {
		editing = null;
		formError = '';
		showForm = true;
	}

	function openEdit(expense: any) {
		editing = expense;
		formError = '';
		showForm = true;
	}

	async function handleSave(expenseData: any) {
		if (saving) return;
		saving = true;
		formError = '';
		const res = await fetch('/api/finance', {
			method: editing ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(
				editing
					? { action: 'updateExpense', expenseId: editing.id, ...expenseData }
					: { action: 'createExpense', ...expenseData }
			)
		});
		saving = false;
		if (res.ok) {
			showForm = false;
			editing = null;
			await invalidateAll();
		} else {
			const body = await res.json().catch(() => null);
			formError = body?.error || 'Could not save the expense. Try again.';
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

	function changeMonth(delta: number) {
		const d = new Date(year, month + delta, 1);
		const url = new URL(window.location.href);
		url.searchParams.set(
			'month',
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
		);
		goto(url.toString(), { replaceState: true });
	}

	function prevMonth() {
		changeMonth(-1);
	}

	function nextMonth() {
		changeMonth(1);
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

<div class="p-4 sm:p-8">
	<PageHeader title="Finance" subtitle="Track your expenses and spending">
		<Button size="sm" onclick={openAdd}>
			<i class="fas fa-plus mr-2 text-xs"></i>
			Add Expense
		</Button>
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-4 lg:col-span-2">
			<!-- Month navigation + search -->
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					aria-label="Previous month"
					class="cursor-pointer rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-fg transition-colors hover:bg-muted"
					onclick={prevMonth}
				>
					<i class="fas fa-chevron-left"></i>
				</button>
				<span class="min-w-[110px] text-center text-sm font-semibold text-fg">
					{monthNames[month]}
					{year}
				</span>
				<button
					type="button"
					aria-label="Next month"
					class="cursor-pointer rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-fg transition-colors hover:bg-muted"
					onclick={nextMonth}
				>
					<i class="fas fa-chevron-right"></i>
				</button>
				<div class="w-full min-w-[140px] flex-1 sm:w-auto">
					<Input
						size="sm"
						bind:value={searchQuery}
						placeholder="Search description or amount..."
						name="expense-search"
					/>
				</div>
			</div>

			<!-- Tag filter -->
			{#if allTags.length > 0}
				<div class="flex flex-wrap gap-1.5">
					<button
						type="button"
						class="cursor-pointer rounded-sm px-2 py-0.5 text-[11px] transition-colors {activeTag ===
						null
							? 'bg-primary text-white'
							: 'bg-muted text-fg hover:bg-border'}"
						onclick={() => (activeTag = null)}
					>
						All
					</button>
					{#each allTags as tag (tag)}
						<button
							type="button"
							class="cursor-pointer rounded-sm px-2 py-0.5 text-[11px] transition-colors {activeTag ===
							tag
								? 'bg-primary text-white'
								: 'bg-muted text-fg hover:bg-border'}"
							onclick={() => (activeTag = activeTag === tag ? null : tag)}
						>
							{tag}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Expense List -->
			<div>
				<h2 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Expenses
					{#if visibleExpenses.length !== expenses.length}
						<span class="ml-1 text-xs font-normal text-fg-subdued">
							({visibleExpenses.length} of {expenses.length})
						</span>
					{/if}
				</h2>

				{#if visibleExpenses.length === 0}
					<EmptyState
						icon="fa-receipt"
						message={expenses.length === 0 ? 'No expenses this month' : 'No expenses match'}
						submessage={expenses.length === 0
							? 'Tap "Add Expense" to log one'
							: 'Adjust search or tags'}
					/>
				{:else}
					<div class="space-y-2">
						{#each visibleExpenses as expense (expense.id)}
							<ExpenseCard
								{expense}
								currency={settings.currency}
								onEdit={openEdit}
								onDelete={handleDeleteExpense}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<MonthlySummary
				total={monthlyStats.total}
				count={monthlyStats.count}
				limit={settings.monthlySpendingLimit}
				currency={settings.currency}
				{year}
				{month}
			/>

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

<!-- Add / Edit dialog -->
<Dialog bind:open={showForm} title={editing ? 'Edit Expense' : 'Add Expense'}>
	{#key editing?.id ?? 'new'}
		<ExpenseForm
			flat
			title={editing ? 'Edit Expense' : 'Add Expense'}
			currency={settings.currency}
			initialValues={editing
				? {
						amount: editing.amount,
						description: editing.description ?? '',
						markdown: editing.markdown ?? '',
						tags: editing.tags ? JSON.parse(editing.tags) : [],
						spentAt: new Date(editing.spentAt).toISOString().split('T')[0]
					}
				: undefined}
			onSave={handleSave}
			onCancel={() => {
				showForm = false;
				editing = null;
			}}
		/>
	{/key}
	{#if formError}
		<p class="mt-2 text-xs text-error">{formError}</p>
	{/if}
	{#snippet footer()}
		{#if saving}
			<span class="text-xs text-fg-subdued">Saving...</span>
		{/if}
	{/snippet}
</Dialog>
