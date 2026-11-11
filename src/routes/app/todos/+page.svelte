<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import type { Todo } from '$lib/types';
	import type { PageData } from './$types';
	import { toDateKey, dateKeyWithOffset } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	// Writable derived: mutations update the list locally without a reload,
	// and fresh load data takes over whenever it changes.
	let todos = $derived(data.todos ?? []);

	let newTitle = $state('');
	let newDueDate = $state('');
	let newPriority = $state<'low' | 'medium' | 'high'>('medium');
	let isAdding = $state(false);
	let currentFilter = $state('today');
	let searchQuery = $state('');

	// Inline edit state for a single row.
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editDueDate = $state('');
	let editPriority = $state<'low' | 'medium' | 'high'>('medium');
	let editInputEl = $state<HTMLInputElement | null>(null);
	$effect(() => {
		if (editingId && editInputEl) editInputEl.focus();
	});

	const todayStr = toDateKey();

	function setQuickDate(offsetDays: number | null) {
		if (offsetDays === null) {
			newDueDate = '';
			return;
		}
		const d = new Date();
		d.setDate(d.getDate() + offsetDays);
		newDueDate = toDateKey(d);
	}

	const filteredTodos = $derived.by(() => {
		const list = todos;
		return list.filter((t: Todo) => {
			if (searchQuery.trim()) {
				if (!t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
					return false;
				}
			}

			switch (currentFilter) {
				case 'today':
					return !t.completed && (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr));
				case 'upcoming':
					return !t.completed && t.dueDate && t.dueDate > todayStr;
				case 'nodate':
					return !t.completed && !t.dueDate;
				case 'completed':
					return t.completed;
				case 'all':
				default:
					return true;
			}
		});
	});

	const counts = $derived.by(() => {
		const list = todos;
		let todayCount = 0;
		let upcomingCount = 0;
		let noDateCount = 0;
		let completedCount = 0;

		for (const t of list) {
			if (t.completed) {
				completedCount++;
			} else if (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr)) {
				todayCount++;
			} else if (t.dueDate && t.dueDate > todayStr) {
				upcomingCount++;
			} else {
				noDateCount++;
			}
		}

		return {
			today: todayCount,
			upcoming: upcomingCount,
			nodate: noDateCount,
			completed: completedCount,
			total: list.length
		};
	});

	let tabFilterItems = $derived([
		{ id: 'today', label: 'Today', count: counts.today },
		{ id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
		{ id: 'nodate', label: 'No Date', count: counts.nodate },
		{ id: 'all', label: 'All', count: counts.total },
		{ id: 'completed', label: 'Completed', count: counts.completed }
	]);

	// Mutations update the local list optimistically. HTTP errors are toasted
	// once by the global fetch handler; only network failures toast here.
	async function handleAdd() {
		if (!newTitle.trim() || isAdding) return;
		isAdding = true;

		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle.trim(),
					dueDate: newDueDate || null,
					priority: newPriority
				})
			});

			if (res.ok) {
				const body = await res.json();
				if (body?.todo) todos = [...todos, body.todo];
				newTitle = '';
				newDueDate = '';
				newPriority = 'medium';
				showToast('Task added', 'success');
			}
		} catch {
			showToast('Network error, task not added', 'error');
		} finally {
			isAdding = false;
		}
	}

	async function handleToggle(t: Todo) {
		const previous = t.completed;
		t.completed = !previous;
		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'toggle',
					id: t.id
				})
			});
			if (!res.ok) t.completed = previous;
		} catch {
			t.completed = previous;
			showToast('Network error, change not saved', 'error');
		}
	}

	async function handleDelete(id: string) {
		const index = todos.findIndex((x) => x.id === id);
		if (index === -1) return;
		const removed = todos[index];
		todos = todos.filter((x) => x.id !== id);

		const restore = () => {
			todos = [...todos.slice(0, index), removed, ...todos.slice(index)];
		};
		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', id })
			});
			if (res.ok) showToast('Task deleted', 'success');
			else restore();
		} catch {
			restore();
			showToast('Network error, task not deleted', 'error');
		}
	}

	function startEdit(t: Todo) {
		editingId = t.id;
		editTitle = t.title;
		editDueDate = t.dueDate ?? '';
		editPriority = (t.priority as 'low' | 'medium' | 'high') ?? 'medium';
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(t: Todo) {
		const title = editTitle.trim();
		if (!title) return;
		const patch = {
			title,
			dueDate: editDueDate || null,
			priority: editPriority
		};
		const previous = { title: t.title, dueDate: t.dueDate, priority: t.priority };
		t.title = patch.title;
		t.dueDate = patch.dueDate;
		t.priority = patch.priority;
		editingId = null;

		try {
			const res = await fetch('/api/todos', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: t.id, ...patch })
			});
			if (!res.ok) Object.assign(t, previous);
		} catch {
			Object.assign(t, previous);
			showToast('Network error, change not saved', 'error');
		}
	}

	function formatDueDate(dueDate: string | null | undefined): { text: string; isOverdue: boolean } {
		if (!dueDate) return { text: '', isOverdue: false };
		if (dueDate === todayStr) return { text: 'Today', isOverdue: false };

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowStr = toDateKey(tomorrow);
		if (dueDate === tomorrowStr) return { text: 'Tomorrow', isOverdue: false };

		const [y, m, d] = dueDate.split('-');
		const formatted = `${d}/${m}/${y}`;
		const isOverdue = dueDate < todayStr;
		return { text: isOverdue ? `${formatted} (Overdue)` : formatted, isOverdue };
	}
</script>

<svelte:head>
	<title>Tasks - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 px-3.5 py-4 pb-24 sm:p-6 sm:pb-8 lg:p-8">
	<PageHeader
		title="Tasks"
		subtitle="Fast and modern management of your daily todos and deadlines"
	/>

	<!-- Quick Add Form -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all sm:p-5">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleAdd();
			}}
			class="space-y-3.5"
		>
			<div class="flex gap-2 sm:gap-2.5">
				<input
					type="text"
					bind:value={newTitle}
					placeholder="Add a task... (e.g. Prepare meeting notes, Review invoice draft)"
					class="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-sm text-fg placeholder:text-fg-subdued/70 focus:border-primary focus:outline-none"
				/>
				<Button type="submit" class="shrink-0" disabled={!newTitle.trim() || isAdding}>
					<i class="fas fa-plus mr-1.5 text-xs"></i>
					<span>Add</span>
				</Button>
			</div>

			<!-- Quick Options: Date & Priority -->
			<div class="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs text-fg-subdued">
				<div class="flex max-w-full flex-wrap items-center gap-1.5">
					<span class="mr-0.5 text-xs font-medium text-fg-subdued">Due:</span>
					<button
						type="button"
						class="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors {newDueDate ===
						todayStr
							? 'bg-primary text-white shadow-xs'
							: 'bg-muted text-fg hover:bg-muted/80'}"
						onclick={() => setQuickDate(0)}
					>
						Today
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors {newDueDate ===
						dateKeyWithOffset(1)
							? 'bg-primary text-white shadow-xs'
							: 'bg-muted text-fg hover:bg-muted/80'}"
						onclick={() => setQuickDate(1)}
					>
						Tomorrow
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors {!newDueDate
							? 'bg-primary text-white shadow-xs'
							: 'bg-muted text-fg hover:bg-muted/80'}"
						onclick={() => setQuickDate(null)}
					>
						No date
					</button>
					<input
						type="date"
						bind:value={newDueDate}
						class="max-w-[130px] rounded-lg border border-border bg-surface px-2 py-1 text-xs text-fg focus:border-primary focus:outline-none"
					/>
				</div>

				<div class="flex items-center gap-1.5">
					<span class="text-xs font-medium text-fg-subdued">Priority:</span>
					<select
						bind:value={newPriority}
						class="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg focus:border-primary focus:outline-none"
					>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>
			</div>
		</form>
	</div>

	<!-- Navigation Tabs & Search -->
	<div
		class="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between"
	>
		<Tabs items={tabFilterItems} bind:active={currentFilter} />

		<div class="w-full sm:w-56">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter tasks..."
				class="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-fg-subdued/70 focus:border-primary focus:outline-none"
			/>
		</div>
	</div>

	<!-- Todos List -->
	{#if filteredTodos.length > 0}
		<div
			class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
		>
			{#each filteredTodos as t (t.id)}
				{@const dueInfo = formatDueDate(t.dueDate)}
				{#if editingId === t.id}
					<div class="p-3">
						<form
							class="space-y-2"
							onsubmit={(e) => {
								e.preventDefault();
								saveEdit(t);
							}}
						>
							<input
								bind:this={editInputEl}
								bind:value={editTitle}
								type="text"
								aria-label="Task title"
								class="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-fg focus:border-primary focus:outline-none"
							/>
							<div class="flex flex-wrap items-center gap-2">
								<input
									type="date"
									bind:value={editDueDate}
									aria-label="Due date"
									class="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-fg focus:border-primary focus:outline-none"
								/>
								<select
									bind:value={editPriority}
									aria-label="Priority"
									class="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg focus:border-primary focus:outline-none"
								>
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
								</select>
								<button
									type="button"
									class="cursor-pointer text-xs text-fg-subdued hover:text-fg"
									onclick={() => (editDueDate = '')}
								>
									No date
								</button>
								<div class="ml-auto flex gap-1.5">
									<Button type="submit" size="sm" disabled={!editTitle.trim()}>Save</Button>
									<Button type="button" variant="secondary" size="sm" onclick={cancelEdit}>
										Cancel
									</Button>
								</div>
							</div>
						</form>
					</div>
				{:else}
					<div
						class="group flex flex-col justify-between gap-2 p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3 {t.completed
							? 'opacity-60'
							: ''}"
					>
						<div class="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
							<button
								type="button"
								class="mt-0.5 flex h-4.5 w-4.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all sm:mt-0 {t.completed
									? 'border-success bg-success text-white'
									: 'border-border-strong hover:border-fg-subdued'}"
								onclick={() => handleToggle(t)}
								aria-label="Toggle task"
							>
								{#if t.completed}
									<i class="fas fa-check text-[9px]"></i>
								{/if}
							</button>

							<button
								type="button"
								class="min-w-0 flex-1 cursor-pointer text-left"
								onclick={() => startEdit(t)}
								title="Edit task"
							>
								<span
									class="text-sm font-medium break-words text-fg {t.completed
										? 'text-fg-subdued line-through'
										: ''}"
								>
									{t.title}
								</span>
							</button>
						</div>

						<div class="flex shrink-0 flex-wrap items-center gap-1.5 pl-7 sm:pl-0">
							{#if t.priority === 'high'}
								<Badge variant="danger" size="sm">High</Badge>
							{:else if t.priority === 'low'}
								<Badge variant="default" size="sm">Low</Badge>
							{/if}

							{#if dueInfo.text}
								<span
									class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] {dueInfo.isOverdue &&
									!t.completed
										? 'bg-error/15 font-medium text-error'
										: 'bg-muted text-fg-subdued'}"
								>
									<i class="far fa-calendar text-[9px]"></i>
									{dueInfo.text}
								</span>
							{/if}

							<button
								type="button"
								class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-subdued opacity-70 transition-opacity hover:bg-muted hover:text-fg sm:opacity-0 sm:group-hover:opacity-100"
								onclick={() => startEdit(t)}
								title="Edit"
								aria-label="Edit task"
							>
								<i class="fas fa-pen text-xs"></i>
							</button>
							<button
								type="button"
								class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-subdued opacity-70 transition-opacity hover:bg-muted hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
								onclick={() => handleDelete(t.id)}
								title="Delete"
								aria-label="Delete task"
							>
								<i class="fas fa-trash text-xs"></i>
							</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{:else}
		<EmptyState
			message="No tasks found"
			submessage={currentFilter === 'today'
				? 'You have no tasks scheduled for today!'
				: 'No tasks match this filter.'}
			icon="fa-check-circle"
		/>
	{/if}
</div>
