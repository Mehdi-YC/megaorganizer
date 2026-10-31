<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { ReminderCard } from '$lib/components/reminders';
	import NotificationPrompt from '$lib/components/NotificationPrompt.svelte';
	import StatGroupCard from '$lib/components/ui/StatGroupCard.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
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

	let analytics = $derived(data.analytics);
	let currency = $derived(data.currency ?? 'DZD');
	let weeklyTraining = $derived<number[]>(data.weeklyTraining ?? []);

	// Scratch notes: autosaved a moment after typing stops.
	// svelte-ignore state_referenced_locally
	let note = $state(data.note ?? '');
	let noteStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let noteTimer: ReturnType<typeof setTimeout> | undefined;

	function queueNoteSave() {
		noteStatus = 'saving';
		clearTimeout(noteTimer);
		noteTimer = setTimeout(saveNote, 600);
	}

	async function saveNote() {
		try {
			const res = await fetch('/api/dashboard-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'save', content: note })
			});
			noteStatus = res.ok ? 'saved' : 'error';
		} catch {
			noteStatus = 'error';
		}
	}

	onMount(() => () => clearTimeout(noteTimer));

	function formatDuration(seconds: number) {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	function getSpendingTrend(): { value: number; positive: boolean } | null {
		if (!analytics) return null;
		const thisM = analytics.spending.thisMonthTotal;
		const lastM = analytics.spending.lastMonthTotal;
		if (lastM === 0) return null;
		const diff = ((thisM - lastM) / lastM) * 100;
		return { value: Math.round(Math.abs(diff)), positive: diff <= 0 };
	}

	function sparklinePath(values: number[]): string {
		if (!values || values.length < 2) return '';
		const max = Math.max(...values, 1);
		const w = 120;
		const h = 28;
		const stepX = w / (values.length - 1);
		return values
			.map(
				(v, i) =>
					`${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(h - (v / max) * h).toFixed(1)}`
			)
			.join(' ');
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
		{ id: 'analytics', label: 'Metrics & Trends' },
		{ id: 'notes', label: 'Scratchpad' }
	]);
</script>

<svelte:head>
	<title>Dashboard - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
	<!-- Page Header with Modern Actions -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Dashboard</h1>
			<p class="mt-1 text-sm text-fg-subdued">
				Your personal knowledge, activities, and operational control center.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button href={resolve('/app/todos')} variant="secondary" size="sm">
				<i class="fas fa-check-square mr-1.5 text-xs"></i> Tasks
			</Button>
			<Button href={resolve('/app/category/new')} size="sm">
				<i class="fas fa-plus mr-1.5 text-xs"></i> New Workspace
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
				<h2 class="text-base font-semibold tracking-tight text-fg">Today's Focus</h2>
				<p class="text-xs text-fg-subdued">
					Active reminders, tasks, and scheduled milestones for today.
				</p>
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

					<div class="grid grid-cols-7 gap-1.5 pt-1">
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
						<h2 class="text-base font-semibold tracking-tight text-fg">Active Reminders</h2>
						<p class="text-xs text-fg-subdued">
							Recurring habits and notifications requiring attention.
						</p>
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

	<!-- TAB: OVERVIEW & ANALYTICS -->
	{#if (activeTab === 'overview' || activeTab === 'analytics') && analytics}
		<div>
			<div class="mb-3">
				<h2 class="text-base font-semibold tracking-tight text-fg">Metrics & Operating Health</h2>
				<p class="text-xs text-fg-subdued">
					Key performance indicators, workout volume, and financial pacing.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatGroupCard
					icon="fa-dumbbell"
					title="Training Volume"
					stats={[
						{ label: 'Sessions (30d)', value: analytics.training.totalSessions },
						{ label: 'Duration', value: formatDuration(analytics.training.totalDuration) },
						{ label: 'This Week', value: analytics.training.thisWeekSessions },
						{ label: 'Avg Session', value: formatDuration(analytics.training.avgDuration) }
					]}
				>
					{#snippet footer()}
						<div class="flex items-center justify-between">
							<svg
								viewBox="0 0 120 28"
								class="h-6 w-full max-w-[140px]"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<path
									d={sparklinePath(weeklyTraining)}
									fill="none"
									stroke="var(--color-primary-text)"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									vector-effect="non-scaling-stroke"
								/>
							</svg>
							<span class="text-[10px] text-fg-subdued">12w trend</span>
						</div>
					{/snippet}
				</StatGroupCard>

				<StatGroupCard
					icon="fa-receipt"
					title="Spending & Outflow"
					trend={getSpendingTrend()}
					stats={[
						{
							label: 'This Month',
							value: `${analytics.spending.thisMonthTotal.toLocaleString()} ${currency}`
						},
						{
							label: 'Last Month',
							value: `${analytics.spending.lastMonthTotal.toLocaleString()} ${currency}`
						},
						{
							label: 'Daily Avg',
							value: `${analytics.spending.avgDaily.toLocaleString()} ${currency}`
						},
						{ label: 'Top Item', value: analytics.spending.topExpenseDescription || 'None' }
					]}
				/>

				<StatGroupCard
					icon="fa-bell"
					title="Habit Consistency"
					stats={[
						{ label: 'Total Tracked', value: analytics.habits.totalReminders },
						{ label: 'Success Rate', value: `${analytics.habits.completionRate}%` },
						{ label: 'Current Streak', value: `${analytics.habits.currentStreak}d` },
						{ label: 'Best Streak', value: `${analytics.habits.bestStreak}d` }
					]}
				/>

				<StatGroupCard
					icon="fa-cubes"
					title="Workspace & Data"
					stats={[
						{ label: 'Indexed Items', value: analytics.products.totalItems },
						{ label: 'Added This Week', value: analytics.products.itemsThisWeek },
						{ label: 'Document Pages', value: analytics.products.totalPages },
						{ label: 'Categories', value: data.categories?.length ?? 0 }
					]}
				/>
			</div>
		</div>
	{/if}

	<!-- Quick Navigation Modules (SaaS Card Grid matching user reference screenshot) -->
	{#if activeTab === 'overview'}
		<div>
			<div class="mb-3">
				<h2 class="text-base font-semibold tracking-tight text-fg">
					Integrated Workspaces & Tools
				</h2>
				<p class="text-xs text-fg-subdued">
					Direct shortcuts to your operational units and records.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Workspace Card -->
				<Card
					title="Workspaces & Wiki"
					description="Organize notes, technical specs, research docs, and markdown pages."
					icon="fas fa-folder-tree"
				>
					{#snippet footer()}
						<div class="flex items-center gap-2">
							<Button href={resolve('/app/category/new')} variant="secondary" size="xs">
								New Workspace
							</Button>
						</div>
						<a href={resolve('/app')} class="text-xs font-medium text-primary-text hover:underline">
							Explore
						</a>
					{/snippet}
				</Card>

				<!-- Financials Card -->
				<Card
					title="Expenses & Invoicing"
					description="Track operating expenses, generate Algerian G12/G12 bis files, and invoice clients."
					icon="fas fa-file-invoice-dollar"
				>
					{#snippet footer()}
						<div class="flex items-center gap-2">
							<Button href={resolve('/app/invoicing/new')} variant="secondary" size="xs">
								New Invoice
							</Button>
						</div>
						<a
							href={resolve('/app/invoicing')}
							class="text-xs font-medium text-primary-text hover:underline"
						>
							Overview
						</a>
					{/snippet}
				</Card>

				<!-- Training Card -->
				<Card
					title="Training & Sport"
					description="Log running sessions with GPX maps, track interval timers, and monitor fitness."
					icon="fas fa-person-running"
				>
					{#snippet footer()}
						<div class="flex items-center gap-2">
							<Button href={resolve('/app/training/session/new')} variant="secondary" size="xs">
								New Session
							</Button>
						</div>
						<a
							href={resolve('/app/training')}
							class="text-xs font-medium text-primary-text hover:underline"
						>
							History
						</a>
					{/snippet}
				</Card>
			</div>
		</div>
	{/if}

	<!-- TAB: SCRATCHPAD / NOTES -->
	{#if activeTab === 'overview' || activeTab === 'notes'}
		<Card
			title="Scratchpad & Daily Notes"
			description="Autosaved scratch space for quick thoughts, links, and temporary data"
			icon="fas fa-pencil"
		>
			{#snippet headerAction()}
				<div class="flex items-center gap-2">
					<Badge
						variant={noteStatus === 'saving'
							? 'warning'
							: noteStatus === 'saved'
								? 'success'
								: 'default'}
						size="sm"
					>
						{noteStatus === 'saving'
							? 'Saving...'
							: noteStatus === 'saved'
								? 'Saved'
								: noteStatus === 'error'
									? 'Error'
									: 'Ready'}
					</Badge>
				</div>
			{/snippet}

			<Textarea
				rows={7}
				placeholder="Anything worth keeping handy or capturing on the fly..."
				bind:value={note}
				oninput={queueNoteSave}
				class="w-full"
			/>
		</Card>
	{/if}
</div>
