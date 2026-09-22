<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ExpenseForm from '$lib/components/finance/ExpenseForm.svelte';

	let show = $state(false);
	let activeTab = $state<'finance' | 'reminder' | 'item'>('finance');

	// Reminder form
	let reminderTitle = $state('');
	let reminderDueDate = $state('');
	let reminderDueTime = $state('09:00');

	// Item form
	let itemName = $state('');

	let saving = $state(false);
	let saved = $state(false);
	let expenseForm: ExpenseForm | undefined = $state();

	function open() {
		show = true;
		resetForms();
	}

	function close() {
		show = false;
		resetForms();
	}

	function resetForms() {
		expenseForm?.reset();
		reminderTitle = '';
		reminderDueDate = '';
		reminderDueTime = '09:00';
		itemName = '';
		saved = false;
	}

	async function saveExpense(data: {
		amount: number;
		description?: string;
		markdown?: string;
		tags?: string[];
		spentAt: string;
		currency: string;
	}) {
		if (saving) return;
		saving = true;
		const res = await fetch('/api/finance', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createExpense', ...data })
		});
		saving = false;
		if (res.ok) {
			expenseForm?.reset();
			saved = true;
			await invalidateAll();
			setTimeout(close, 1000);
		}
	}

	async function saveReminder() {
		if (saving || !reminderTitle.trim()) return;
		saving = true;
		const dueAt = reminderDueDate ? new Date(`${reminderDueDate}T${reminderDueTime}`) : new Date();
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'createTemplate',
				title: reminderTitle,
				recurrenceType: 'daily',
				recurrenceConfig: JSON.stringify({ hour: dueAt.getHours(), minute: dueAt.getMinutes() }),
				nextDueAt: dueAt.toISOString()
			})
		});
		saving = false;
		if (res.ok) {
			saved = true;
			await invalidateAll();
			setTimeout(close, 1000);
		}
	}

	async function saveItem() {
		if (saving || !itemName.trim()) return;
		saving = true;
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'create',
				name: itemName,
				type: 'item'
			})
		});
		saving = false;
		if (res.ok) {
			saved = true;
			await invalidateAll();
			setTimeout(close, 1000);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!show) return;
		if (e.key === 'Escape') {
			close();
			return;
		}
		const target = e.target as HTMLElement | null;
		const typing = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
		// Tab shortcuts only outside fields, so typing "2" stays a "2"
		if (!typing && e.key >= '1' && e.key <= '3') {
			if (e.key === '1') activeTab = 'finance';
			if (e.key === '2') activeTab = 'reminder';
			if (e.key === '3') activeTab = 'item';
			saved = false;
			return;
		}
		// Enter submits the active tab; textareas keep Enter for newlines
		if (e.key === 'Enter' && target?.tagName === 'INPUT') {
			e.preventDefault();
			if (activeTab === 'finance') expenseForm?.submit();
			else if (activeTab === 'reminder') saveReminder();
			else saveItem();
		}
	}

	const tabs = [
		{ id: 'finance' as const, label: 'Finance', icon: 'fa-receipt', color: 'text-warning' },
		{ id: 'reminder' as const, label: 'Reminder', icon: 'fa-bell', color: 'text-primary' },
		{ id: 'item' as const, label: 'Item', icon: 'fa-cube', color: 'text-success' }
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB Button -->
<button
	type="button"
	class="fixed right-6 bottom-6 z-40 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-105 hover:bg-primary-hover active:scale-95"
	onclick={open}
	aria-label="Quick capture"
>
	<i class="fas fa-plus text-sm"></i>
</button>

<!-- Modal -->
{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
		onclick={close}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="animate-slide-up w-full max-w-md rounded-t-lg border border-border bg-surface shadow-2xl sm:rounded-lg"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<h2 class="text-sm font-semibold text-fg-accent">Quick Capture</h2>
				<button
					type="button"
					class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm hover:bg-muted"
					onclick={close}
					aria-label="Close"
				>
					<i class="fas fa-times text-xs text-fg-subdued"></i>
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-border">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors {activeTab ===
						tab.id
							? 'border-b-2 border-primary bg-primary/5 text-primary'
							: 'text-fg-subdued hover:text-fg'}"
						onclick={() => {
							activeTab = tab.id;
							saved = false;
						}}
					>
						<i class="fas {tab.icon} text-[10px]"></i>
						<span class="hidden sm:inline">{tab.label}</span>
					</button>
				{/each}
			</div>

			<!-- Form Content -->
			<div class="max-h-[65vh] overflow-y-auto p-4">
				{#if saved}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10"
						>
							<i class="fas fa-check text-xl text-success"></i>
						</div>
						<p class="text-sm font-medium text-fg">Saved!</p>
					</div>
				{:else}
					<!-- Finance Form -->
					{#if activeTab === 'finance'}
						<ExpenseForm bind:this={expenseForm} flat title="Add Expense" onSave={saveExpense} />

						<!-- Reminder Form -->
					{:else if activeTab === 'reminder'}
						<div class="space-y-3">
							<Input
								type="text"
								name="qc-title"
								label="TITLE"
								bind:value={reminderTitle}
								placeholder="Reminder title"
							/>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label
										for="qc-duedate"
										class="mb-1.5 block text-[10px] font-semibold tracking-wide text-fg-subdued"
										>DATE</label
									>
									<input
										type="date"
										id="qc-duedate"
										bind:value={reminderDueDate}
										class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-base text-fg focus:border-primary focus:outline-none sm:text-sm"
									/>
								</div>
								<div>
									<label
										for="qc-duetime"
										class="mb-1.5 block text-[10px] font-semibold tracking-wide text-fg-subdued"
										>TIME</label
									>
									<input
										type="time"
										id="qc-duetime"
										bind:value={reminderDueTime}
										class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-base text-fg focus:border-primary focus:outline-none sm:text-sm"
									/>
								</div>
							</div>
							<Button
								class="w-full"
								onclick={saveReminder}
								disabled={!reminderTitle.trim() || saving}
							>
								{saving ? 'Saving...' : 'Add Reminder'}
							</Button>
						</div>

						<!-- Item Form -->
					{:else if activeTab === 'item'}
						<div class="space-y-3">
							<Input
								type="text"
								name="qc-item"
								label="ITEM NAME"
								bind:value={itemName}
								placeholder="Item name"
							/>
							<Button class="w-full" onclick={saveItem} disabled={!itemName.trim() || saving}>
								{saving ? 'Saving...' : 'Add Item'}
							</Button>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Keyboard hints -->
			<div class="flex items-center justify-center gap-4 border-t border-border px-4 py-2">
				{#each tabs as tab, i (tab.id)}
					<span class="text-[10px] text-fg-subdued">
						<kbd class="rounded bg-muted px-1 py-0.5 text-[9px]">{i + 1}</kbd>
						{tab.label}
					</span>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-slide-up {
		animation: slide-up 0.2s ease-out;
	}
</style>
