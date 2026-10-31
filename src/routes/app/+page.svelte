<script lang="ts">
	import { resolve } from '$app/paths';
	import { ReminderCard } from '$lib/components/reminders';
	import NotificationPrompt from '$lib/components/NotificationPrompt.svelte';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { Reminder, CalendarEvent, Todo } from '$lib/types';
	import { showToast } from '$lib/utils/toast.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let dueReminders = $state<Reminder[]>(data.dueReminders ?? []);
	// svelte-ignore state_referenced_locally
	let todayTodos = $state<Todo[]>(data.todayTodos ?? []);
	let quickTodoTitle = $state('');
	let isAddingTodo = $state(false);

	let activeTab = $state('overview');

	async function handleAddQuickTodo() {
		if (!quickTodoTitle.trim() || isAddingTodo) return;
		isAddingTodo = true;
		const title = quickTodoTitle.trim();
		const todayStr = new Date().toISOString().slice(0, 10);
		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, dueDate: todayStr })
			});
			if (res.ok) {
				const json = await res.json();
				todayTodos = [json.todo, ...todayTodos];
				quickTodoTitle = '';
				showToast('Task added', 'success');
			}
		} catch {
			showToast('Error adding task', 'error');
		} finally {
			isAddingTodo = false;
		}
	}

	async function handleToggleQuickTodo(t: Todo) {
		t.completed = !t.completed;
		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'toggle', id: t.id })
			});
			if (!res.ok) {
				t.completed = !t.completed;
			}
		} catch {
			t.completed = !t.completed;
		}
	}

	// Scratch notes
	// svelte-ignore state_referenced_locally
	let note = $state(data.note ?? '');
	// svelte-ignore state_referenced_locally
	let lastSavedNote = $state(data.note ?? '');
	let noteStatus = $state<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');

	$effect(() => {
		if (note !== lastSavedNote && noteStatus !== 'saving') {
			noteStatus = 'unsaved';
		}
	});

	async function saveNote() {
		noteStatus = 'saving';
		try {
			const res = await fetch('/api/dashboard-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'save', content: note })
			});
			if (res.ok) {
				lastSavedNote = note;
				noteStatus = 'saved';
				showToast('Scratchpad saved', 'success');
			} else {
				noteStatus = 'error';
				showToast('Failed to save scratchpad', 'error');
			}
		} catch {
			noteStatus = 'error';
			showToast('Failed to save scratchpad', 'error');
		}
	}

	function getWeekDays(): Date[] {
		const today = new Date();
		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(today);
			day.setDate(today.getDate() + i);
			days.push(day);
		}
		return days;
	}

	function isSameDay(d1: Date, d2: Date): boolean {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
		return events.filter((e) => isSameDay(new Date(e.date), day));
	}

	async function handleCompleteReminder(id: string) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'completeReminder', reminderId: id })
		});
		if (res.ok) {
			dueReminders = dueReminders.map((r) =>
				r.id === id ? { ...r, completed: true, completedAt: new Date().toISOString() } : r
			);
			showToast('Reminder completed', 'success');
		}
	}

	async function handleSnoozeReminder(id: string, until: Date) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'snoozeReminder', reminderId: id, until: until.toISOString() })
		});
		if (res.ok) {
			dueReminders = dueReminders.filter((r) => r.id !== id);
			showToast('Reminder snoozed', 'success');
		}
	}

	async function handleTodoToggle(todoId: string, completed: boolean) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTodo', todoId, completed })
		});
		if (res.ok) {
			dueReminders = dueReminders.map((r) => ({
				...r,
				todos: (r.todos ?? []).map((t) => (t.id === todoId ? { ...t, completed } : t))
			}));
		}
	}

	let tabItems = $derived([
		{ id: 'overview', label: 'All Modules' },
		{ id: 'tasks', label: 'Today Focus', count: todayTodos.length + dueReminders.length },
		{ id: 'notes', label: 'Scratchpad' }
	]);
</script>

<svelte:head>
	<title>Dashboard - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-3.5 py-4 pb-24 sm:p-6 sm:pb-8 lg:p-8">
	<!-- Page Header with Modern Actions -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1
				class="cursor-help text-2xl font-bold tracking-tight text-fg sm:text-3xl"
				title="Your personal knowledge, activities, and operational control center."
			>
				Dashboard
			</h1>
		</div>

		<div class="flex items-center gap-2">
			<Button href={resolve('/app/todos')} variant="secondary" size="sm">
				<i class="fas fa-check-square mr-1.5 text-xs"></i> Tasks
			</Button>
			<Button href={resolve('/app/category/new')} size="sm">
				<i class="fas fa-plus mr-1.5 text-xs"></i> Workspace
			</Button>
		</div>
	</div>

	<!-- Segmented Control Tabs (Modern SaaS Style like reference image) -->
	<div class="border-b border-border pb-3">
		<Tabs items={tabItems} bind:active={activeTab} />
	</div>

	{#if (data.stats?.itemCount ?? 0) === 0 && (data.stats?.sessionCount ?? 0) === 0 && (data.categories?.length ?? 0) === 0}
		<section class="rounded-xl border border-primary/20 bg-primary-subdued/30 p-5">
			<h2 class="text-sm font-semibold text-fg">Welcome to MegaOrganize</h2>
			<p class="mt-1 text-xs text-fg-subdued">
				Everything lives in workspaces, items, and scheduled sessions. Pick a starting point:
			</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-3">
				<a
					href={resolve('/app/category/new')}
					class="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-xs"
				>
					<div
						class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subdued text-primary-text"
					>
						<i class="fas fa-folder-plus text-xs"></i>
					</div>
					<p class="text-sm font-semibold text-fg group-hover:text-primary-text">
						Create a workspace
					</p>
					<p class="mt-0.5 text-xs text-fg-subdued">Give your pages and notes a structured home.</p>
				</a>
				<a
					href={resolve('/app/library')}
					class="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-xs"
				>
					<div
						class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subdued text-primary-text"
					>
						<i class="fas fa-cube text-xs"></i>
					</div>
					<p class="text-sm font-semibold text-fg group-hover:text-primary-text">Add an item</p>
					<p class="mt-0.5 text-xs text-fg-subdued">Track gear, books, cards, or collections.</p>
				</a>
				<a
					href={resolve('/app/training/session/new')}
					class="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-xs"
				>
					<div
						class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subdued text-primary-text"
					>
						<i class="fas fa-dumbbell text-xs"></i>
					</div>
					<p class="text-sm font-semibold text-fg group-hover:text-primary-text">Log a session</p>
					<p class="mt-0.5 text-xs text-fg-subdued">Track your sports, running, and workouts.</p>
				</a>
			</div>
		</section>
	{/if}

	<NotificationPrompt />

	<!-- TAB: OVERVIEW & ALL MODULES -->
	{#if activeTab === 'overview' || activeTab === 'tasks'}
		<!-- Section: Today's Priorities & Action Cards -->
		<div>
			<div class="mb-3">
				<h2
					class="cursor-help text-base font-semibold tracking-tight text-fg"
					title="Active reminders, tasks, and scheduled milestones for today."
				>
					Today's Focus
				</h2>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				<!-- Today's Tasks Card -->
				<Card
					title="Today's Tasks"
					description="Fast capture and daily task execution"
					icon="fas fa-check-square"
				>
					{#snippet headerAction()}
						<a
							href={resolve('/app/todos')}
							class="text-xs font-medium text-primary-text hover:underline"
						>
							View all
						</a>
					{/snippet}

					<!-- Quick Add Input -->
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleAddQuickTodo();
						}}
						class="mb-3.5 flex gap-2"
					>
						<input
							type="text"
							bind:value={quickTodoTitle}
							placeholder="Add a task for today..."
							class="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-fg placeholder:text-fg-subdued/70 focus:border-primary focus:outline-none"
						/>
						<Button type="submit" size="xs" disabled={!quickTodoTitle.trim() || isAddingTodo}>
							<i class="fas fa-plus text-[10px]"></i>
						</Button>
					</form>

					<!-- Todo items list -->
					{#if todayTodos.length > 0}
						<div class="max-h-56 space-y-1.5 overflow-y-auto pr-1">
							{#each todayTodos as t (t.id)}
								<div
									class="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/50 {t.completed
										? 'opacity-60'
										: ''}"
								>
									<div class="flex min-w-0 flex-1 items-center gap-2.5">
										<button
											type="button"
											class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors {t.completed
												? 'border-success bg-success text-white'
												: 'border-border-strong hover:border-fg-subdued'}"
											onclick={() => handleToggleQuickTodo(t)}
											aria-label="Toggle task"
										>
											{#if t.completed}
												<i class="fas fa-check text-[8px]"></i>
											{/if}
										</button>
										<span
											class="truncate text-fg {t.completed ? 'text-fg-subdued line-through' : ''}"
										>
											{t.title}
										</span>
									</div>
									{#if t.priority === 'high'}
										<Badge variant="danger" size="sm">High</Badge>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="py-6 text-center text-xs text-fg-subdued">
							<i class="fas fa-clipboard-check mb-1.5 block text-xl text-fg-subdued/30"></i>
							No tasks pending for today. You're all caught up!
						</div>
					{/if}
				</Card>

				<!-- Upcoming Schedule Strip -->
				<Card
					title="Upcoming This Week"
					description="Calendar agenda and scheduled deadlines"
					icon="fas fa-calendar-days"
				>
					{#snippet headerAction()}
						<a
							href={resolve('/app/calendar')}
							class="text-xs font-medium text-primary-text hover:underline"
						>
							Calendar
						</a>
					{/snippet}

					<div class="no-scrollbar max-w-full overflow-x-auto pb-1">
						<div class="grid min-w-[320px] grid-cols-7 gap-1.5 pt-1 sm:min-w-0">
							{#each getWeekDays() as day, dayIdx (dayIdx)}
								{@const dayEvents = getEventsForDay(day, data.upcomingEvents ?? [])}
								{@const isToday = isSameDay(day, new Date())}
								<div
									class="flex flex-col items-center rounded-lg border p-2 transition-all {isToday
										? 'border-primary bg-primary/5 shadow-xs'
										: 'border-border/60 bg-muted/20'}"
								>
									<span
										class="text-[10px] font-medium {isToday
											? 'font-semibold text-primary'
											: 'text-fg-subdued'}"
									>
										{day.toLocaleDateString([], { weekday: 'short' })}
									</span>
									<span class="mt-0.5 text-sm font-bold {isToday ? 'text-primary' : 'text-fg'}">
										{day.getDate()}
									</span>
									<div class="mt-1 flex min-h-[6px] gap-1">
										{#each dayEvents.slice(0, 3) as event (`${event.type}:${event.id}`)}
											<span
												class="h-1.5 w-1.5 rounded-full {event.type === 'training'
													? 'bg-blue-500'
													: 'bg-success'}"
												title={event.title}
											></span>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>

					{#if data.upcomingEvents && data.upcomingEvents.length > 0}
						<div class="mt-3.5 max-h-36 space-y-1.5 overflow-y-auto pr-1">
							{#each (data.upcomingEvents ?? []).slice(0, 3) as ev (`${ev.type}:${ev.id}`)}
								<a
									href={ev.type === 'training'
										? resolve('/app/training/session/[id]', { id: ev.id })
										: resolve('/app/reminders/[id]', { id: ev.id })}
									class="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-2.5 py-1.5 text-xs text-fg transition-colors hover:bg-muted/40"
								>
									<span class="truncate font-medium">{ev.title}</span>
									<span class="ml-2 shrink-0 text-[10px] text-fg-subdued">
										{new Date(ev.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
									</span>
								</a>
							{/each}
						</div>
					{/if}
				</Card>
			</div>
		</div>

		<!-- Due Reminders Section -->
		{#if dueReminders.length > 0}
			<div>
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h2
							class="cursor-help text-base font-semibold tracking-tight text-fg"
							title="Recurring habits and notifications requiring attention."
						>
							Active Reminders
						</h2>
					</div>
					<a
						href={resolve('/app/reminders')}
						class="text-xs font-medium text-primary-text hover:underline"
					>
						View all
					</a>
				</div>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each dueReminders as reminder (reminder.id)}
						<ReminderCard
							{reminder}
							onComplete={handleCompleteReminder}
							onSnooze={handleSnoozeReminder}
							onTodoToggle={handleTodoToggle}
						/>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Workspaces & Knowledge -->
	{#if activeTab === 'overview'}
		<div>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<h2
						class="cursor-help text-base font-semibold tracking-tight text-fg"
						title="Your active knowledge spaces, documentation, and page trees."
					>
						Workspaces
					</h2>
				</div>
				<Button href={resolve('/app/category/new')} variant="secondary" size="xs">
					<i class="fas fa-plus mr-1 text-[10px]"></i> Workspace
				</Button>
			</div>

			{#if data.categories && data.categories.length > 0}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.categories as cat (cat.id)}
						<div
							class="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-xs"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-center gap-2.5">
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subdued/80 text-primary-text"
										style={cat.iconColor
											? `background-color: ${cat.iconColor}20; color: ${cat.iconColor};`
											: ''}
									>
										<i class="{cat.icon || 'fas fa-folder'} text-sm"></i>
									</div>
									<div class="min-w-0">
										<a
											href={resolve('/app/category/[id]', { id: cat.id })}
											class="block truncate text-sm font-semibold text-fg transition-colors group-hover:text-primary-text"
										>
											{cat.name}
										</a>
										<p class="text-[11px] text-fg-subdued">
											{cat.pages?.length ?? 0}
											{cat.pages?.length === 1 ? 'page' : 'pages'}
										</p>
									</div>
								</div>

								<!-- Action icons on hover: subtle by default, fully visible on hover -->
								<div
									class="flex items-center gap-1 opacity-70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
								>
									<a
										href={resolve('/app/category/[id]', { id: cat.id })}
										class="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-fg-subdued transition-colors hover:border-primary hover:bg-surface hover:text-primary-text"
										title="Open workspace"
										aria-label="Open workspace"
									>
										<i class="fas fa-arrow-right text-[10px]"></i>
									</a>
								</div>
							</div>

							{#if cat.description}
								<p class="mt-2.5 line-clamp-2 text-xs text-fg-subdued">
									{cat.description}
								</p>
							{/if}

							{#if cat.pages && cat.pages.length > 0}
								<div class="mt-3 border-t border-border/50 pt-2.5">
									<div class="space-y-1">
										{#each cat.pages.slice(0, 2) as p (p.id)}
											<a
												href={resolve('/app/category/[id]/page/[pageId]', {
													id: cat.id,
													pageId: p.id
												})}
												class="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-fg-subdued transition-colors hover:bg-muted/50 hover:text-fg"
											>
												<i class="{p.icon || 'far fa-file-lines'} text-[10px] text-fg-subdued/70"
												></i>
												<span class="truncate">{p.name}</span>
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
					<i class="fas fa-folder-open mb-2 block text-2xl text-fg-subdued/40"></i>
					<p class="text-sm font-medium text-fg">No workspaces yet</p>
					<p class="mt-0.5 text-xs text-fg-subdued">
						Create a workspace to group pages, documents, and notes.
					</p>
					<Button href={resolve('/app/category/new')} size="xs" class="mt-3">
						<i class="fas fa-plus mr-1 text-[10px]"></i> Create Workspace
					</Button>
				</div>
			{/if}
		</div>

		<!-- Tools & Modules Row -->
		<div>
			<div class="mb-3">
				<h2
					class="cursor-help text-base font-semibold tracking-tight text-fg"
					title="Quick shortcuts into dedicated operational modules."
				>
					Integrated Tools
				</h2>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Invoicing -->
				<a
					href={resolve('/app/invoicing')}
					class="group flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-primary/50 hover:shadow-xs"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
							>
								<i class="fas fa-file-invoice-dollar text-xs"></i>
							</div>
							<div>
								<p class="text-xs font-semibold text-fg group-hover:text-primary-text">
									Invoicing & Taxes
								</p>
								<p class="text-[10px] text-fg-subdued">Clients, G12 & bills</p>
							</div>
						</div>
						<i
							class="fas fa-chevron-right text-[10px] text-fg-subdued opacity-70 transition-all group-hover:translate-x-0.5 group-hover:text-primary-text sm:opacity-0 sm:group-hover:opacity-100"
						></i>
					</div>
				</a>

				<!-- Training -->
				<a
					href={resolve('/app/training')}
					class="group flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-primary/50 hover:shadow-xs"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"
							>
								<i class="fas fa-person-running text-xs"></i>
							</div>
							<div>
								<p class="text-xs font-semibold text-fg group-hover:text-primary-text">
									Training & Sport
								</p>
								<p class="text-[10px] text-fg-subdued">GPX runs, workouts</p>
							</div>
						</div>
						<i
							class="fas fa-chevron-right text-[10px] text-fg-subdued opacity-70 transition-all group-hover:translate-x-0.5 group-hover:text-primary-text sm:opacity-0 sm:group-hover:opacity-100"
						></i>
					</div>
				</a>

				<!-- Library -->
				<a
					href={resolve('/app/library')}
					class="group flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-primary/50 hover:shadow-xs"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
							>
								<i class="fas fa-cube text-xs"></i>
							</div>
							<div>
								<p class="text-xs font-semibold text-fg group-hover:text-primary-text">
									Item Library
								</p>
								<p class="text-[10px] text-fg-subdued">Gear & collections</p>
							</div>
						</div>
						<i
							class="fas fa-chevron-right text-[10px] text-fg-subdued opacity-70 transition-all group-hover:translate-x-0.5 group-hover:text-primary-text sm:opacity-0 sm:group-hover:opacity-100"
						></i>
					</div>
				</a>

				<!-- Mindmap -->
				<a
					href={resolve('/app/mindmap')}
					class="group flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-primary/50 hover:shadow-xs"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400"
							>
								<i class="fas fa-network-wired text-xs"></i>
							</div>
							<div>
								<p class="text-xs font-semibold text-fg group-hover:text-primary-text">Mindmap</p>
								<p class="text-[10px] text-fg-subdued">Visual concepts & nodes</p>
							</div>
						</div>
						<i
							class="fas fa-chevron-right text-[10px] text-fg-subdued opacity-70 transition-all group-hover:translate-x-0.5 group-hover:text-primary-text sm:opacity-0 sm:group-hover:opacity-100"
						></i>
					</div>
				</a>
			</div>
		</div>
	{/if}

	<!-- TAB: SCRATCHPAD / NOTES -->
	{#if activeTab === 'overview' || activeTab === 'notes'}
		<div class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary-text"
					>
						<i class="fas fa-pencil text-xs"></i>
					</div>
					<h2
						class="cursor-help text-base font-semibold tracking-tight text-fg"
						title="Personal markdown workspace with live WYSIWYG formatting and preview"
					>
						Scratchpad & Daily Notes
					</h2>
				</div>

				<div class="flex items-center gap-2">
					{#if noteStatus === 'unsaved'}
						<Badge variant="warning" size="sm">Unsaved</Badge>
					{:else if noteStatus === 'saving'}
						<Badge variant="default" size="sm">Saving...</Badge>
					{:else if noteStatus === 'saved'}
						<Badge variant="success" size="sm">
							<i class="fas fa-check mr-1 text-[9px]"></i> Saved
						</Badge>
					{:else if noteStatus === 'error'}
						<Badge variant="danger" size="sm">Error saving</Badge>
					{/if}

					<Button onclick={saveNote} size="xs" disabled={noteStatus === 'saving'}>
						<i class="fas fa-floppy-disk mr-1.5 text-[10px]"></i> Save
					</Button>
				</div>
			</div>

			<MarkdownEditor
				bind:value={note}
				placeholder="Anything worth keeping handy or capturing on the fly... (Markdown, formatting & [[wikilinks]] supported)"
				rows={8}
				minHeight="220px"
				onSave={saveNote}
			/>
		</div>
	{/if}
</div>
