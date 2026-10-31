<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';
	import ExpenseForm from '$lib/components/finance/ExpenseForm.svelte';
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';

	let show = $state(false);
	let activeTab = $state<'finance' | 'reminder' | 'item' | 'training'>('finance');
	const TRAINING_TYPES = [
		'strength',
		'running',
		'cycling',
		'walking',
		'swimming',
		'hiit',
		'other'
	] as const;
	let trainingType = $state<(typeof TRAINING_TYPES)[number]>('strength');

	// Reminder form
	let reminderTitle = $state('');
	let reminderDueDate = $state('');
	let reminderDueTime = $state('09:00');

	// Item form
	let itemName = $state('');
	let itemBody = $state('');

	let saving = $state(false);
	let saved = $state(false);
	let expenseForm: ExpenseForm | undefined = $state();

	function open(prefill?: { name?: string; text?: string; url?: string }) {
		show = true;
		resetForms();
		if (prefill) {
			activeTab = 'item';
			const urlLine = prefill.url && !prefill.text?.includes(prefill.url) ? prefill.url : '';
			itemBody = [prefill.text, urlLine].filter(Boolean).join('\n\n');
			itemName =
				prefill.name ||
				(prefill.text ? prefill.text.split('\n')[0].slice(0, 60) : '') ||
				'Shared item';
		}
	}

	// Accept shared text from the Android share sheet (PWA share_target):
	// open prefilled, then strip the query params from the URL.
	let shareHandled = false;
	$effect(() => {
		const params = page.url.searchParams;
		const shareText = params.get('share_text');
		const shareTitle = params.get('share_title');
		const shareUrl = params.get('share_url');
		if (shareHandled || (!shareText && !shareTitle && !shareUrl)) return;
		shareHandled = true;
		open({
			name: shareTitle ?? undefined,
			text: shareText ?? undefined,
			url: shareUrl ?? undefined
		});
		// Strip the share params so a reload does not reopen the dialog.
		replaceState(page.url.pathname, {});
	});

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
		itemBody = '';
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
				action: 'createReminder',
				title: reminderTitle,
				dueAt: dueAt.toISOString()
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
				type: 'item',
				markdown: itemBody.trim() || undefined
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
		const target = e.target as HTMLElement | null;
		const typing = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
		if (!show) {
			// 'c' opens quick capture from anywhere outside a text field
			if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'c') {
				e.preventDefault();
				open();
			}
			return;
		}
		if (e.key === 'Escape') {
			close();
			return;
		}
		// Tab shortcuts only outside fields, so typing "2" stays a "2"
		if (!typing && e.key >= '1' && e.key <= '4') {
			if (e.key === '1') activeTab = 'finance';
			if (e.key === '2') activeTab = 'reminder';
			if (e.key === '3') activeTab = 'item';
			if (e.key === '4') activeTab = 'training';
			saved = false;
			return;
		}
		// Enter submits the active tab; textareas keep Enter for newlines
		if (e.key === 'Enter' && target?.tagName === 'INPUT') {
			e.preventDefault();
			if (activeTab === 'finance') expenseForm?.submit();
			else if (activeTab === 'reminder') saveReminder();
			else if (activeTab === 'training') startTraining();
			else saveItem();
		}
	}

	function startTraining() {
		close();
		// Fixed route with a query param; resolve() only handles route patterns.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/app/training/session/new?type=${trainingType}`);
	}

	const tabs = [
		{ id: 'finance' as const, label: 'Finance', icon: 'fa-receipt', color: 'text-warning' },
		{ id: 'reminder' as const, label: 'Reminder', icon: 'fa-bell', color: 'text-primary-text' },
		{ id: 'item' as const, label: 'Item', icon: 'fa-cube', color: 'text-success' },
		{ id: 'training' as const, label: 'Training', icon: 'fa-dumbbell', color: 'text-fg-accent' }
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB Button -->
<button
	type="button"
	class="no-print fixed right-4 bottom-5 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-105 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 sm:right-6 sm:bottom-6"
	onclick={() => open()}
	aria-label="Quick capture"
>
	<i class="fas fa-plus text-sm"></i>
</button>

<!-- Modal -->
{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="no-print fixed inset-0 z-50 flex items-end justify-center bg-surface-overlay/80 p-0 backdrop-blur-xs sm:items-center sm:p-4"
		onclick={close}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="animate-slide-up w-full max-w-md rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Quick Capture"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border/80 px-6 py-4">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subdued text-primary-text"
					>
						<i class="fas fa-bolt text-xs"></i>
					</div>
					<h2 class="text-base font-semibold tracking-tight text-fg">Quick Capture</h2>
				</div>
				<button
					type="button"
					class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={close}
					aria-label="Close"
				>
					<i class="fas fa-times text-xs"></i>
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-border/60 bg-muted/20 px-2 pt-2">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all {activeTab ===
						tab.id
							? 'border-x border-t border-border/80 bg-surface font-semibold text-fg shadow-xs'
							: 'text-fg-subdued hover:text-fg'}"
						aria-label={tab.label}
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
			<div class="max-h-[65vh] overflow-y-auto px-6 py-5">
				{#if saved}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success"
						>
							<i class="fas fa-check text-xl"></i>
						</div>
						<p class="text-sm font-semibold text-fg">Saved successfully!</p>
					</div>
				{:else}
					<!-- Finance Form -->
					{#if activeTab === 'finance'}
						<ExpenseForm bind:this={expenseForm} flat title="Add Expense" onSave={saveExpense} />

						<!-- Reminder Form -->
					{:else if activeTab === 'reminder'}
						<div class="space-y-3.5">
							<Input
								type="text"
								name="qc-title"
								label="Title"
								bind:value={reminderTitle}
								placeholder="Reminder title"
							/>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="qc-duedate" class="mb-1.5 block text-xs font-medium text-fg"
										>Date</label
									>
									<input
										type="date"
										id="qc-duedate"
										bind:value={reminderDueDate}
										class="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-fg shadow-xs focus:border-primary focus:outline-none"
									/>
								</div>
								<div>
									<label for="qc-duetime" class="mb-1.5 block text-xs font-medium text-fg"
										>Time</label
									>
									<input
										type="time"
										id="qc-duetime"
										bind:value={reminderDueTime}
										class="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-fg shadow-xs focus:border-primary focus:outline-none"
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
								label="Item name"
								bind:value={itemName}
								placeholder="Item name"
							/>
							<div>
								<span class="mb-1 block text-xs font-medium text-fg-subdued">Notes</span>
								<MarkdownEditor
									bind:value={itemBody}
									rows={4}
									minHeight="120px"
									placeholder="Notes (markdown and [[wikilinks]] supported)"
								/>
							</div>
							<Button class="w-full" onclick={saveItem} disabled={!itemName.trim() || saving}>
								{saving ? 'Saving...' : 'Add Item'}
							</Button>
						</div>

						<!-- Training Form -->
					{:else if activeTab === 'training'}
						<div class="space-y-3">
							<div class="flex flex-wrap gap-1.5">
								{#each TRAINING_TYPES as t (t)}
									<button
										type="button"
										class="cursor-pointer rounded-sm px-2.5 py-1 text-xs font-medium capitalize transition-colors {trainingType ===
										t
											? 'bg-primary text-white'
											: 'bg-muted text-fg hover:bg-border'}"
										onclick={() => (trainingType = t)}
									>
										{t}
									</button>
								{/each}
							</div>
							<Button class="w-full" onclick={startTraining}>
								<i class="fas fa-play mr-2 text-xs"></i>
								Start Training
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
