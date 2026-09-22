<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let show = $state(false);
	let activeTab = $state<'expense' | 'reminder' | 'item' | 'note'>('expense');

	// Expense form
	let expenseAmount = $state<number>(0);
	let expenseDescription = $state('');
	let expenseDate = $state(new Date().toISOString().split('T')[0]);

	// Reminder form
	let reminderTitle = $state('');
	let reminderDueDate = $state('');
	let reminderDueTime = $state('09:00');

	// Item form
	let itemName = $state('');

	// Note form
	let noteContent = $state('');

	let saving = $state(false);
	let saved = $state(false);

	function open() {
		show = true;
		resetForms();
	}

	function close() {
		show = false;
		resetForms();
	}

	function resetForms() {
		expenseAmount = 0;
		expenseDescription = '';
		expenseDate = new Date().toISOString().split('T')[0];
		reminderTitle = '';
		reminderDueDate = '';
		reminderDueTime = '09:00';
		itemName = '';
		noteContent = '';
		saved = false;
	}

	async function saveExpense() {
		if (expenseAmount <= 0) return;
		saving = true;
		const res = await fetch('/api/finance', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'createExpense',
				amount: expenseAmount,
				description: expenseDescription || undefined,
				spentAt: new Date(expenseDate).toISOString()
			})
		});
		saving = false;
		if (res.ok) {
			saved = true;
			await invalidateAll();
			setTimeout(close, 1000);
		}
	}

	async function saveReminder() {
		if (!reminderTitle.trim()) return;
		saving = true;
		const dueAt = reminderDueDate
			? new Date(`${reminderDueDate}T${reminderDueTime}`)
			: new Date();
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
		if (!itemName.trim()) return;
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

	async function saveNote() {
		if (!noteContent.trim()) return;
		saving = true;
		// Create as an item with markdown
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'create',
				name: noteContent.substring(0, 50) + (noteContent.length > 50 ? '...' : ''),
				type: 'item',
				markdown: noteContent
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
		if (e.key === 'Escape' && show) {
			close();
		}
		// Quick shortcuts when modal is open
		if (show) {
			if (e.key === '1') activeTab = 'expense';
			if (e.key === '2') activeTab = 'reminder';
			if (e.key === '3') activeTab = 'item';
			if (e.key === '4') activeTab = 'note';
		}
	}

	const tabs = [
		{ id: 'expense' as const, label: 'Expense', icon: 'fa-receipt', color: 'text-warning' },
		{ id: 'reminder' as const, label: 'Reminder', icon: 'fa-bell', color: 'text-primary' },
		{ id: 'item' as const, label: 'Item', icon: 'fa-cube', color: 'text-success' },
		{ id: 'note' as const, label: 'Quick Note', icon: 'fa-sticky-note', color: 'text-purple-500' }
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB Button -->
<button
	type="button"
	class="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary-hover hover:scale-105 active:scale-95"
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
		class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={close}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-t-lg sm:rounded-lg bg-surface border border-border shadow-2xl animate-slide-up"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-border">
				<h2 class="text-sm font-semibold text-fg-accent">Quick Capture</h2>
				<button
					type="button"
					class="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-muted"
					onclick={close}
					aria-label="Close"
				>
					<i class="fas fa-times text-xs text-fg-subdued"></i>
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-border">
				{#each tabs as tab}
					<button
						type="button"
						class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors {activeTab === tab.id
							? 'text-primary border-b-2 border-primary bg-primary/5'
							: 'text-fg-subdued hover:text-fg'}"
						onclick={() => { activeTab = tab.id; saved = false; }}
					>
						<i class="fas {tab.icon} text-[10px]"></i>
						<span class="hidden sm:inline">{tab.label}</span>
					</button>
				{/each}
			</div>

			<!-- Form Content -->
			<div class="p-4">
				{#if saved}
					<div class="py-8 text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
							<i class="fas fa-check text-xl text-success"></i>
						</div>
						<p class="text-sm font-medium text-fg">Saved!</p>
					</div>
				{:else}
					<!-- Expense Form -->
					{#if activeTab === 'expense'}
						<div class="space-y-3">
							<div>
								<label for="qc-amount" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">AMOUNT</label>
								<input
									type="number"
									id="qc-amount"
									bind:value={expenseAmount}
									min="0"
									step="0.01"
									placeholder="0.00"
									class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
								/>
							</div>
							<div>
								<label for="qc-desc" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">DESCRIPTION</label>
								<input
									type="text"
									id="qc-desc"
									bind:value={expenseDescription}
									placeholder="What for?"
									class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
								/>
							</div>
							<div>
								<label for="qc-date" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">DATE</label>
								<input
									type="date"
									id="qc-date"
									bind:value={expenseDate}
									class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
								/>
							</div>
							<button
								type="button"
								class="w-full h-[36px] rounded-sm bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
								onclick={saveExpense}
								disabled={expenseAmount <= 0 || saving}
							>
								{saving ? 'Saving...' : 'Add Expense'}
							</button>
						</div>

					<!-- Reminder Form -->
					{:else if activeTab === 'reminder'}
						<div class="space-y-3">
							<div>
								<label for="qc-title" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">TITLE</label>
								<input
									type="text"
									id="qc-title"
									bind:value={reminderTitle}
									placeholder="Reminder title"
									class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
								/>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="qc-duedate" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">DATE</label>
									<input
										type="date"
										id="qc-duedate"
										bind:value={reminderDueDate}
										class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
									/>
								</div>
								<div>
									<label for="qc-duetime" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">TIME</label>
									<input
										type="time"
										id="qc-duetime"
										bind:value={reminderDueTime}
										class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
									/>
								</div>
							</div>
							<button
								type="button"
								class="w-full h-[36px] rounded-sm bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
								onclick={saveReminder}
								disabled={!reminderTitle.trim() || saving}
							>
								{saving ? 'Saving...' : 'Add Reminder'}
							</button>
						</div>

					<!-- Item Form -->
					{:else if activeTab === 'item'}
						<div class="space-y-3">
							<div>
								<label for="qc-item" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">ITEM NAME</label>
								<input
									type="text"
									id="qc-item"
									bind:value={itemName}
									placeholder="Item name"
									class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
								/>
							</div>
							<button
								type="button"
								class="w-full h-[36px] rounded-sm bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
								onclick={saveItem}
								disabled={!itemName.trim() || saving}
							>
								{saving ? 'Saving...' : 'Add Item'}
							</button>
						</div>

					<!-- Note Form -->
					{:else if activeTab === 'note'}
						<div class="space-y-3">
							<p class="text-[11px] text-fg-subdued">Creates an item in your library with markdown content</p>
							<div>
								<label for="qc-note" class="block text-[10px] font-semibold text-fg-subdued tracking-wide mb-1.5">NOTE CONTENT</label>
								<textarea
									id="qc-note"
									bind:value={noteContent}
									placeholder="Write your note here (supports markdown)..."
									rows="4"
									class="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg font-mono focus:border-primary focus:outline-none resize-none"
								></textarea>
							</div>
							<button
								type="button"
								class="w-full h-[36px] rounded-sm bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
								onclick={saveNote}
								disabled={!noteContent.trim() || saving}
							>
								{saving ? 'Saving...' : 'Save to Library'}
							</button>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Keyboard hints -->
			<div class="px-4 py-2 border-t border-border flex items-center justify-center gap-4">
				{#each tabs as tab, i}
					<span class="text-[10px] text-fg-subdued">
						<kbd class="px-1 py-0.5 rounded bg-muted text-[9px]">{i + 1}</kbd> {tab.label}
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