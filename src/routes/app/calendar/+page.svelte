<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSessionIcon } from '$lib/utils/training';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	let { data } = $props();
	let sessions = $derived<any[]>(data.sessions ?? []);
	let reminders = $derived<any[]>(data.reminders ?? []);
	let virtualReminders = $derived<any[]>(data.virtualReminders ?? []);
	let templates = $derived<any[]>(data.templates ?? []);
	let expenses = $derived<any[]>(data.expenses ?? []);
	let expenseSettings = $derived<any>(data.expenseSettings ?? { currency: 'DZD' });
	let monthlyExpenses = $derived<any[]>(data.monthlyExpenses ?? []);
	let filter = $derived(data.filter);
	let currentDate = $state(new Date());

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

		const days = [];
		for (let i = 0; i < startDay; i++) days.push(null);
		for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
		return days;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
	}

	function getEventsForDate(date: Date) {
		const events: Array<{
			type: 'training' | 'reminder' | 'scheduled' | 'expense';
			id: string;
			title: string;
			completed?: boolean;
			isVirtual?: boolean;
			time?: string;
			amount?: number;
		}> = [];

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

	function setFilter(newFilter: string | null) {
		const url = new URL(window.location.href);
		if (newFilter) {
			url.searchParams.set('filter', newFilter);
		} else {
			url.searchParams.delete('filter');
		}
		goto(url.toString(), { replaceState: true });
	}

	let selectedDate = $state<Date | null>(null);
	let selectedEvents = $state<any[]>([]);

	function handleDateClick(date: Date) {
		selectedDate = date;
		selectedEvents = getEventsForDate(date);
	}

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

<div class="p-4 sm:p-6 lg:p-8">
	<PageHeader title="Calendar" subtitle="View all your events in one place">
		<!-- Filter buttons -->
		<button
			type="button"
			class="inline-flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors {!filter
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => setFilter(null)}
		>
			All
		</button>
		<button
			type="button"
			class="inline-flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors {filter ===
			'training'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => setFilter('training')}
		>
			<i class="fas fa-dumbbell text-[10px]"></i>
			Training
		</button>
		<button
			type="button"
			class="inline-flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors {filter ===
			'reminders'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => setFilter('reminders')}
		>
			<i class="fas fa-bell text-[10px]"></i>
			Reminders
		</button>
		<button
			type="button"
			class="inline-flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors {filter ===
			'finance'
				? 'bg-primary text-white'
				: 'bg-muted text-fg hover:bg-border'}"
			onclick={() => setFilter('finance')}
		>
			<i class="fas fa-receipt text-[10px]"></i>
			Finance
		</button>
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Calendar -->
		<div class="lg:col-span-2">
			<div class="rounded-sm border border-border bg-surface p-3 sm:p-6">
				<div class="mb-4 flex items-center justify-between sm:mb-6">
					<button
						type="button"
						aria-label="Previous month"
						class="cursor-pointer rounded-sm px-3 py-2 text-sm font-medium text-fg hover:bg-muted"
						onclick={prevMonth}
					>
						<i class="fas fa-chevron-left"></i>
					</button>
					<h2 class="text-lg font-semibold text-fg">
						{monthNames[currentDate.getMonth()]}
						{currentDate.getFullYear()}
					</h2>
					<button
						type="button"
						aria-label="Next month"
						class="cursor-pointer rounded-sm px-3 py-2 text-sm font-medium text-fg hover:bg-muted"
						onclick={nextMonth}
					>
						<i class="fas fa-chevron-right"></i>
					</button>
				</div>

				<!-- Monthly Overview Header -->
				<div class="mb-4 flex flex-wrap gap-3 sm:gap-6">
					<div class="flex items-center gap-2">
						<div class="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-500/10">
							<i class="fas fa-dumbbell text-[10px] text-blue-600"></i>
						</div>
						<div>
							<p class="text-sm font-semibold text-fg">
								{getMonthOverview(currentDate).trainingCount}
							</p>
							<p class="text-[10px] text-fg-subdued">Trainings</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div class="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10">
							<i class="fas fa-tasks text-[10px] text-primary"></i>
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
						<div class="flex h-7 w-7 items-center justify-center rounded-sm bg-warning/10">
							<i class="fas fa-receipt text-[10px] text-warning"></i>
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
					{#each dayNames as day}
						<div
							class="bg-muted px-1 py-1.5 text-center text-[10px] font-semibold text-fg-subdued uppercase sm:px-2 sm:py-2 sm:text-xs"
						>
							{day}
						</div>
					{/each}

					{#each getDaysInMonth(currentDate) as date}
						{@const events = date ? getEventsForDate(date) : []}
						{@const hasTraining = events.some((e) => e.type === 'training')}
						{@const hasReminders = events.some((e) => e.type === 'reminder')}
						{@const hasUncompleted = events.some((e) => e.type === 'reminder' && !e.completed)}
						{@const hasExpenses = events.some((e) => e.type === 'expense')}

						<div
							class="min-h-[40px] cursor-pointer bg-surface p-1 transition-colors hover:bg-muted sm:min-h-[100px] sm:p-2 {date
								? ''
								: 'opacity-0'} {selectedDate && date && selectedDate.getTime() === date.getTime()
								? 'ring-2 ring-primary'
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
									{#each events.slice(0, 3) as event}
										<div
											class="truncate rounded-sm px-1.5 py-0.5 text-[10px] {event.type ===
											'training'
												? 'bg-blue-500/10 text-blue-600'
												: event.type === 'scheduled'
													? 'bg-muted text-fg-subdued italic'
													: event.type === 'expense'
														? 'bg-warning/10 text-warning'
														: event.completed
															? 'bg-success/10 text-success line-through'
															: 'bg-error/10 text-error'}"
											title={event.title}
										>
											{event.type === 'expense'
												? `${event.amount?.toLocaleString()} - ${event.title}`
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

		<!-- Selected Day Details -->
		<div>
			<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
				{selectedDate ? formatSelectedDate(selectedDate) : 'Select a Day'}
			</h3>

			{#if selectedDate}
				{#if selectedEvents.length === 0}
					<div class="rounded-sm border border-dashed border-border py-8 text-center">
						<i class="fas fa-calendar-day mb-2 text-2xl text-fg-subdued/30"></i>
						<p class="text-sm text-fg-subdued">No events for this day</p>
					</div>
				{:else}
					<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
						{#each selectedEvents as event}
							{@const href =
								event.type === 'training'
									? `/app/training/session/${event.id}`
									: event.type === 'expense'
										? `/app/finance`
										: event.type === 'scheduled'
											? `/app/reminders/${event.templateId || event.id.split('_')[1]}`
											: `/app/reminders/${event.id}`}
							<a
								{href}
								class="flex items-center gap-3 rounded-sm border {event.type === 'training'
									? 'border-blue-500/30 bg-blue-500/5'
									: event.type === 'expense'
										? 'border-warning/30 bg-warning/5'
										: event.type === 'scheduled'
											? 'border-muted bg-muted/30'
											: event.completed
												? 'border-success/30 bg-success/5'
												: 'border-error/30 bg-error/5'} p-3 transition-all hover:border-primary/50"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm {event.type ===
									'training'
										? 'bg-blue-500/10'
										: event.type === 'expense'
											? 'bg-warning/10'
											: event.type === 'scheduled'
												? 'bg-muted'
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
				<div class="rounded-sm border border-dashed border-border py-12 text-center">
					<i class="fas fa-calendar mb-2 text-2xl text-fg-subdued/30"></i>
					<p class="text-sm text-fg-subdued">Click on a day to see events</p>
				</div>
			{/if}
		</div>
	</div>
</div>
