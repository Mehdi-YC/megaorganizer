<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	type UpcomingItem = {
		id: string;
		templateId?: string | null;
		title: string;
		dueAt: Date | string;
		isVirtual: boolean;
	};

	type CalendarEntry = {
		type: 'training' | 'reminder' | 'scheduled' | 'expense' | 'todo';
		id: string;
		templateId?: string | null;
		title: string;
		completed?: boolean;
		isVirtual?: boolean;
		time?: string;
		amount?: number;
		duration?: number | null;
	};

	let { data } = $props();
	let sessions = $derived(data.sessions ?? []);
	let reminders = $derived(data.reminders ?? []);
	let virtualReminders = $derived(data.virtualReminders ?? []);
	let expenses = $derived(data.expenses ?? []);
	let upcoming = $derived<UpcomingItem[]>(data.upcoming ?? []);
	let expenseSettings = $derived(data.expenseSettings ?? { currency: 'DZD' });
	let filter = $derived(data.filter);
	let currentDate = $derived.by(() => {
		const m = data.month;
		if (m && /^\d{4}-\d{2}$/.test(m)) {
			const [y, mo] = m.split('-').map(Number);
			return new Date(y, mo - 1, 1);
		}
		return new Date();
	});

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

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function getDaysInMonth(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0

		const days: Array<{ key: string; date: Date | null }> = [];
		for (let i = 0; i < startDay; i++) days.push({ key: `pad-${i}`, date: null });
		for (let i = 1; i <= daysInMonth; i++)
			days.push({ key: `d-${i}`, date: new Date(year, month, i) });
		return days;
	}

	function changeMonth(delta: number) {
		const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
		const url = new URL(window.location.href);
		url.searchParams.set(
			'month',
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
		);
		selectedDate = null;
		selectedEvents = [];
		// resolve() supplies the base path; url.search carries the updated month
		// plus any other query params already on the URL. The rule cannot see that
		// the literal is already resolved, because the search string is dynamic.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/app/calendar')}${url.search}`, { replaceState: true });
	}

	function prevMonth() {
		changeMonth(-1);
	}

	function nextMonth() {
		changeMonth(1);
	}

	function getEventsForDate(date: Date): CalendarEntry[] {
		const events: CalendarEntry[] = [];

		// Add training sessions
		if (!filter || filter === 'training') {
			const daySessions = sessions.filter((s) => {
				const sessionDate = new Date(s.startedAt);
				return (
					sessionDate.getFullYear() === date.getFullYear() &&
					sessionDate.getMonth() === date.getMonth() &&
					sessionDate.getDate() === date.getDate()
				);
			});

			for (const session of daySessions) {
				events.push({
					type: 'training',
					id: session.id,
					title: session.title || 'Training Session',
					time: new Date(session.startedAt).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					})
				});
			}
		}

		// Add existing reminders (instances)
		if (!filter || filter === 'reminders') {
			const dayReminders = reminders.filter((r) => {
				const reminderDate = new Date(r.dueAt);
				return (
					reminderDate.getFullYear() === date.getFullYear() &&
					reminderDate.getMonth() === date.getMonth() &&
					reminderDate.getDate() === date.getDate()
				);
			});

			for (const reminder of dayReminders) {
				events.push({
					type: 'reminder',
					id: reminder.id,
					title: reminder.title,
					completed: reminder.completed,
					time: new Date(reminder.dueAt).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					})
				});
			}

			// Add virtual (scheduled) reminders from templates
			const dayVirtual = virtualReminders.filter((r) => {
				const reminderDate = new Date(r.dueAt);
				return (
					reminderDate.getFullYear() === date.getFullYear() &&
					reminderDate.getMonth() === date.getMonth() &&
					reminderDate.getDate() === date.getDate()
				);
			});

			for (const vReminder of dayVirtual) {
				// Don't add if there's already a real reminder for this template on this day
				const hasReal = events.some(
					(e) => e.type === 'reminder' && e.id.includes(vReminder.templateId)
				);
				if (!hasReal) {
					events.push({
						type: 'scheduled',
						id: vReminder.id,
						templateId: vReminder.templateId,
						title: vReminder.title,
						isVirtual: true,
						time: new Date(vReminder.dueAt).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit'
						})
					});
				}
			}
		}

		// Add simple todos scheduled for this date
		if (!filter || filter === 'todos') {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			const dateStr = `${y}-${m}-${d}`;

			const dayTodos = (data.todos ?? []).filter((t) => t.dueDate === dateStr);
			for (const todoItem of dayTodos) {
				events.push({
					type: 'todo',
					id: todoItem.id,
					title: todoItem.title,
					completed: todoItem.completed,
					time: todoItem.dueTime || undefined
				});
			}
		}

		// Add expenses
		if (!filter || filter === 'finance') {
			const dayExpenses = expenses.filter((e) => {
				const expenseDate = new Date(e.spentAt);
				return (
					expenseDate.getFullYear() === date.getFullYear() &&
					expenseDate.getMonth() === date.getMonth() &&
					expenseDate.getDate() === date.getDate()
				);
			});

			for (const exp of dayExpenses) {
				events.push({
					type: 'expense',
					id: exp.id,
					title: exp.description || 'Expense',
					amount: exp.amount,
					time: ''
				});
			}
		}

		return events;
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
	}

	/** Target for a calendar event, matching the shape the server sent. */
	function eventHref(event: CalendarEntry): string {
		if (event.type === 'todo') return resolve('/app/todos');
		if (event.type === 'training') return resolve('/app/training/session/[id]', { id: event.id });
		if (event.type === 'expense') return resolve('/app/finance');
		if (event.type === 'scheduled') {
			return resolve('/app/reminders/[id]', {
				id: event.templateId || event.id.split('_')[1]
			});
		}
		return resolve('/app/reminders/[id]', { id: event.id });
	}

	function setFilter(newFilter: string | null) {
		const url = new URL(window.location.href);
		if (newFilter) {
			url.searchParams.set('filter', newFilter);
		} else {
			url.searchParams.delete('filter');
		}
		// See changeMonth: the path is resolved, the search string is dynamic.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/app/calendar')}${url.search}`, { replaceState: true });
	}

	let selectedDate = $state<Date | null>(null);
	let selectedEvents = $state<CalendarEntry[]>([]);

	function handleDateClick(date: Date) {
		selectedDate = date;
		selectedEvents = getEventsForDate(date);
	}

	function clearSelection() {
		selectedDate = null;
		selectedEvents = [];
	}

	function dayLabel(date: Date): string {
		const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const diffDays = Math.round((startOf(date) - startOf(new Date())) / 86_400_000);
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Tomorrow';
		return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function isSameCalendarDay(d1: Date, d2: Date): boolean {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	let upcomingGroups = $derived.by(() => {
		const groups: Array<{ date: Date; items: UpcomingItem[] }> = [];
		for (const item of upcoming) {
			const d = new Date(item.dueAt);
			const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
			const last = groups[groups.length - 1];
			if (last && isSameCalendarDay(last.date, day)) last.items.push(item);
			else groups.push({ date: day, items: [item] });
		}
		return groups;
	});

	function formatSelectedDate(date: Date): string {
		return date.toLocaleDateString([], {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getMonthOverview(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const startDate = new Date(year, month, 1);
		const endDate = new Date(year, month + 1, 0, 23, 59, 59);
		const now = new Date();

		// Count training sessions
		const monthSessions = sessions.filter((s) => {
			const d = new Date(s.startedAt);
			return d >= startDate && d <= endDate;
		});

		// Count reminders
		const monthReminders = reminders.filter((r) => {
			const d = new Date(r.dueAt);
			return d >= startDate && d <= endDate;
		});

		// Count completed reminders
		const completedReminders = monthReminders.filter((r) => r.completed);

		// Count missed reminders (past due and not completed)
		const missedReminders = monthReminders.filter((r) => !r.completed && new Date(r.dueAt) < now);

		// Sum expenses
		const monthExpenseTotal = expenses
			.filter((e) => {
				const d = new Date(e.spentAt);
				return d >= startDate && d <= endDate;
			})
			.reduce((sum, e) => sum + e.amount, 0);

		return {
			trainingCount: monthSessions.length,
			reminderCount: monthReminders.length,
			completedCount: completedReminders.length,
			missedCount: missedReminders.length,
			expenseTotal: monthExpenseTotal
		};
	}
</script>

<svelte:head>
	<title>Calendar - MegaOrganize</title>
</svelte:head>

<div class="px-3.5 py-4 pb-24 sm:p-6 sm:pb-8 lg:p-8">
	<PageHeader title="Calendar" subtitle="View all your events in one place">
		<!-- Filter buttons -->
		<div
			class="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto py-0.5 sm:flex-wrap"
		>
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 {!filter
					? 'bg-primary text-white shadow-xs'
					: 'bg-muted text-fg hover:bg-muted/80'}"
				onclick={() => setFilter(null)}
			>
				All
			</button>
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 {filter ===
				'training'
					? 'bg-primary text-white shadow-xs'
					: 'bg-muted text-fg hover:bg-muted/80'}"
				onclick={() => setFilter('training')}
			>
				<i class="fas fa-dumbbell text-[10px]"></i>
				Training
			</button>
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 {filter ===
				'reminders'
					? 'bg-primary text-white shadow-xs'
					: 'bg-muted text-fg hover:bg-muted/80'}"
				onclick={() => setFilter('reminders')}
			>
				<i class="fas fa-bell text-[10px]"></i>
				Reminders
			</button>
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 {filter ===
				'finance'
					? 'bg-primary text-white shadow-xs'
					: 'bg-muted text-fg hover:bg-muted/80'}"
				onclick={() => setFilter('finance')}
			>
				<i class="fas fa-receipt text-[10px]"></i>
				Finance
			</button>
			<button
				type="button"
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 {filter ===
				'todos'
					? 'bg-primary text-white shadow-xs'
					: 'bg-muted text-fg hover:bg-muted/80'}"
				onclick={() => setFilter('todos')}
			>
				<i class="fas fa-check-square text-[10px]"></i>
				Tasks
			</button>
		</div>
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Calendar -->
		<div class="lg:col-span-2">
			<div class="rounded-xl border border-border bg-surface p-5 shadow-xs">
				<div class="mb-4 flex items-center justify-between sm:mb-6">
					<button
						type="button"
						aria-label="Previous month"
						class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
						onclick={prevMonth}
					>
						<i class="fas fa-chevron-left text-xs"></i>
					</button>
					<h2 class="text-base font-bold tracking-tight text-fg sm:text-lg">
						{monthNames[currentDate.getMonth()]}
						{currentDate.getFullYear()}
					</h2>
					<button
						type="button"
						aria-label="Next month"
						class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
						onclick={nextMonth}
					>
						<i class="fas fa-chevron-right text-xs"></i>
					</button>
				</div>

				<!-- Monthly Overview Header -->
				<div class="mb-4 flex flex-wrap gap-3 sm:gap-6">
					<div class="flex items-center gap-2">
						<div
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs"
						>
							<i class="fas fa-dumbbell text-[10px]"></i>
						</div>
						<div>
							<p class="text-sm font-semibold text-fg">
								{getMonthOverview(currentDate).trainingCount}
							</p>
							<p class="text-[10px] text-fg-subdued">Trainings</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
						>
							<i class="fas fa-tasks text-[10px]"></i>
						</div>
						<div>
							<p class="text-sm font-semibold text-fg">
								{getMonthOverview(currentDate).reminderCount}
								<span class="text-xs font-normal text-fg-subdued">
									({getMonthOverview(currentDate).completedCount}
									<i class="fas fa-check text-success"></i>
									/ {getMonthOverview(currentDate).missedCount}
									<i class="fas fa-times text-error"></i>)
								</span>
							</p>
							<p class="text-[10px] text-fg-subdued">Tasks (completed / missed)</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs"
						>
							<i class="fas fa-receipt text-[10px]"></i>
						</div>
						<div>
							<p class="text-sm font-semibold text-fg">
								{getMonthOverview(currentDate).expenseTotal.toLocaleString()}
								{expenseSettings.currency}
							</p>
							<p class="text-[10px] text-fg-subdued">Expenses</p>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-7 gap-px bg-border">
					{#each dayNames as day (day)}
						<div
							class="bg-muted px-1 py-1.5 text-center text-[10px] font-semibold text-fg-subdued uppercase sm:px-2 sm:py-2 sm:text-xs"
						>
							{day}
						</div>
					{/each}

					{#each getDaysInMonth(currentDate) as cell (cell.key)}
						{@const date = cell.date}
						{@const events = date ? getEventsForDate(date) : []}
						{@const hasTraining = events.some((e) => e.type === 'training')}
						{@const hasReminders = events.some((e) => e.type === 'reminder')}
						{@const hasUncompleted = events.some((e) => e.type === 'reminder' && !e.completed)}
						{@const hasExpenses = events.some((e) => e.type === 'expense')}

						<div
							class="min-h-[40px] cursor-pointer bg-surface p-1 transition-colors hover:bg-muted sm:min-h-[100px] sm:p-2 {date
								? ''
								: 'opacity-0'} {selectedDate && date && selectedDate.getTime() === date.getTime()
								? 'ring-2 ring-primary-text'
								: ''}"
							onclick={() => date && handleDateClick(date)}
							onkeydown={(e) => e.key === 'Enter' && date && handleDateClick(date)}
							role="button"
							tabindex={date ? 0 : -1}
						>
							{#if date}
								<div class="mb-0.5 flex items-center justify-between sm:mb-1">
									<span
										class="text-[11px] sm:text-sm {isToday(date)
											? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white sm:h-6 sm:w-6'
											: 'text-fg'}"
									>
										{date.getDate()}
									</span>
									<div class="flex gap-0.5">
										{#if hasTraining}
											<div class="h-2 w-2 rounded-full bg-blue-500" title="Training"></div>
										{/if}
										{#if hasReminders}
											<div
												class="h-2 w-2 rounded-full {hasUncompleted ? 'bg-error' : 'bg-success'}"
												title="Reminders"
											></div>
										{/if}
										{#if hasExpenses}
											<div class="h-2 w-2 rounded-full bg-warning" title="Expenses"></div>
										{/if}
									</div>
								</div>

								<div class="hidden space-y-0.5 sm:block">
									{#each events.slice(0, 3) as event (event)}
										<div
											class="truncate rounded-sm px-1.5 py-0.5 text-[10px] {event.type ===
											'training'
												? 'bg-blue-500/10 text-blue-600'
												: event.type === 'scheduled'
													? 'bg-muted text-fg-subdued italic'
													: event.type === 'expense'
														? 'bg-warning/10 text-warning'
														: event.type === 'todo'
															? event.completed
																? 'bg-success/10 text-success line-through'
																: 'bg-primary-subdued text-primary-text'
															: event.completed
																? 'bg-success/10 text-success line-through'
																: 'bg-error/10 text-error'}"
											title={event.title}
										>
											{event.type === 'expense'
												? `${event.amount?.toLocaleString()} - ${event.title}`
												: event.type === 'todo'
													? `✓ ${event.title}`
													: event.title}
										</div>
									{/each}
									{#if events.length > 3}
										<div class="text-center text-[9px] text-fg-subdued">
											+{events.length - 3} more
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Legend -->
				<div class="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-fg-subdued">
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span>Training</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-primary-text"></div>
						<span>Tasks</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-success"></div>
						<span>Completed</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-error"></div>
						<span>Pending</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-muted"></div>
						<span>Scheduled</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-full bg-warning"></div>
						<span>Expense</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Side panel: Upcoming reminders (default) / Selected Day Details -->
		<div>
			{#if selectedDate}
				<div class="mb-3 flex items-center justify-between gap-2">
					<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
						{formatSelectedDate(selectedDate)}
					</h3>
					<button
						type="button"
						class="inline-flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary-text transition-colors hover:bg-muted"
						onclick={clearSelection}
					>
						<i class="fas fa-arrow-left text-[10px]"></i>
						Upcoming
					</button>
				</div>

				{#if selectedEvents.length === 0}
					<div class="rounded-sm border border-dashed border-border py-8 text-center">
						<i class="fas fa-calendar-day mb-2 text-2xl text-fg-subdued/30"></i>
						<p class="text-sm text-fg-subdued">No events for this day</p>
					</div>
				{:else}
					<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
						{#each selectedEvents as event (event.id)}
							{@const href = eventHref(event)}
							<!-- eventHref() returns a resolved path; the rule cannot see through the call. -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								{href}
								class="flex items-center gap-3 rounded-sm border {event.type === 'training'
									? 'border-blue-500/30 bg-blue-500/5'
									: event.type === 'expense'
										? 'border-warning/30 bg-warning/5'
										: event.type === 'scheduled'
											? 'border-muted bg-muted/30'
											: event.type === 'todo'
												? event.completed
													? 'border-success/30 bg-success/5'
													: 'border-primary/40 bg-primary-subdued'
												: event.completed
													? 'border-success/30 bg-success/5'
													: 'border-error/30 bg-error/5'} p-3 transition-all hover:border-primary-text/50"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm {event.type ===
									'training'
										? 'bg-blue-500/10'
										: event.type === 'expense'
											? 'bg-warning/10'
											: event.type === 'scheduled'
												? 'bg-muted'
												: event.type === 'todo'
													? event.completed
														? 'bg-success/10'
														: 'bg-primary/20'
													: event.completed
														? 'bg-success/10'
														: 'bg-error/10'}"
								>
									<i
										class="fas {event.type === 'training'
											? 'fa-dumbbell text-blue-600'
											: event.type === 'expense'
												? 'fa-receipt text-warning'
												: event.type === 'scheduled'
													? 'fa-clock text-fg-subdued'
													: event.type === 'todo'
														? event.completed
															? 'fa-check-square text-success'
															: 'fa-check-square text-primary-text'
														: event.completed
															? 'fa-check text-success'
															: 'fa-bell text-error'} text-xs"
									></i>
								</div>
								<div class="min-w-0 flex-1">
									<p
										class="text-sm font-medium {event.type === 'scheduled'
											? 'text-fg-subdued'
											: 'text-fg'} truncate"
									>
										{event.title}
									</p>
									<p class="text-[10px] text-fg-subdued">
										{#if event.type === 'expense'}
											{event.amount?.toLocaleString()} {expenseSettings.currency}
										{:else}
											{event.time}
											{#if event.type === 'scheduled'}
												· Scheduled
											{:else if event.type === 'training' && event.duration}
												· {Math.floor(event.duration / 60)}m
											{/if}
										{/if}
									</p>
								</div>
								<i class="fas fa-arrow-right text-[10px] text-fg-subdued/50"></i>
							</a>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
						Upcoming Reminders
					</h3>
					<a
						href={resolve('/app/reminders')}
						class="text-xs text-primary-text hover:text-primary-text-hover">View All</a
					>
				</div>

				{#if upcomingGroups.length === 0}
					<div class="rounded-sm border border-dashed border-border py-12 text-center">
						<i class="fas fa-bell mb-2 text-2xl text-fg-subdued/30"></i>
						<p class="text-sm text-fg-subdued">No upcoming reminders</p>
						<p class="mt-1 text-xs text-fg-subdued/70">Tap a day to see its events</p>
					</div>
				{:else}
					<div class="max-h-[440px] space-y-3 overflow-y-auto pr-1">
						{#each upcomingGroups as group (group.date.getTime())}
							<div>
								<button
									type="button"
									class="mb-1.5 flex w-full cursor-pointer items-center gap-2 text-left"
									onclick={() => handleDateClick(group.date)}
								>
									<span class="text-xs font-semibold text-fg">{dayLabel(group.date)}</span>
									<span class="text-[10px] text-fg-subdued">
										{group.items.length} reminder{group.items.length !== 1 ? 's' : ''}
									</span>
									<span class="h-px flex-1 bg-border/50"></span>
									<i class="fas fa-chevron-right text-[9px] text-fg-subdued/50"></i>
								</button>
								<div class="space-y-1">
									{#each group.items as item (item.id)}
										{@const time = new Date(item.dueAt).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit'
										})}
										<a
											href={resolve('/app/reminders/[id]', {
												id: item.isVirtual ? (item.templateId ?? item.id) : item.id
											})}
											class="flex items-center gap-2.5 rounded-sm border {item.isVirtual
												? 'border-muted bg-muted/30'
												: 'border-error/30 bg-error/5'} px-3 py-2 transition-all hover:border-primary-text/50"
										>
											<span class="w-11 shrink-0 text-[10px] text-fg-subdued">{time}</span>
											<p
												class="min-w-0 flex-1 truncate text-sm {item.isVirtual
													? 'text-fg-subdued italic'
													: 'text-fg'}"
											>
												{item.title}
											</p>
											<span
												class="shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-medium {item.isVirtual
													? 'bg-muted text-fg-subdued'
													: 'bg-error/10 text-error'}"
											>
												{item.isVirtual ? 'Scheduled' : 'Pending'}
											</span>
										</a>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					<p class="mt-3 text-center text-[10px] text-fg-subdued/70">Tap a day to see its events</p>
				{/if}
			{/if}
		</div>
	</div>
</div>
