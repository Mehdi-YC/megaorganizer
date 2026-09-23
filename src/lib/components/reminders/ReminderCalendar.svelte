<script lang="ts">
	let {
		reminders = [],
		selectedDate = $bindable(null),
		onDateClick
	}: {
		reminders?: Array<{
			id: string;
			title: string;
			dueAt: Date | string;
			completed: boolean;
			templateId: string;
		}>;
		selectedDate?: Date | null;
		onDateClick?: (date: Date, reminders: any[]) => void;
	} = $props();

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

		const days: Array<{ key: string; date: Date | null }> = [];
		for (let i = 0; i < startDay; i++) days.push({ key: `pad-${i}`, date: null });
		for (let i = 1; i <= daysInMonth; i++)
			days.push({ key: `d-${i}`, date: new Date(year, month, i) });
		return days;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
	}

	function getRemindersForDate(date: Date) {
		return reminders.filter((r) => {
			const reminderDate = new Date(r.dueAt);
			return (
				reminderDate.getFullYear() === date.getFullYear() &&
				reminderDate.getMonth() === date.getMonth() &&
				reminderDate.getDate() === date.getDate()
			);
		});
	}

	function getDateStatus(date: Date): 'completed' | 'missed' | 'upcoming' | 'mixed' {
		const dayReminders = getRemindersForDate(date);
		if (dayReminders.length === 0) return 'upcoming';

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (dateDay > today) return 'upcoming';

		const allCompleted = dayReminders.every((r) => r.completed);
		const noneCompleted = dayReminders.every((r) => !r.completed);

		if (allCompleted) return 'completed';
		if (noneCompleted) return 'missed';
		return 'mixed';
	}

	function getStatusDotColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'bg-success';
			case 'missed':
				return 'bg-error';
			case 'mixed':
				return 'bg-warning';
			default:
				return 'bg-fg-subdued/30';
		}
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
	}

	function isSelected(date: Date) {
		if (!selectedDate) return false;
		return (
			date.getFullYear() === selectedDate.getFullYear() &&
			date.getMonth() === selectedDate.getMonth() &&
			date.getDate() === selectedDate.getDate()
		);
	}

	function handleDateClick(date: Date) {
		selectedDate = date;
		const dayReminders = getRemindersForDate(date);
		onDateClick?.(date, dayReminders);
	}
</script>

<div class="rounded-sm border border-border bg-surface p-4">
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
			<div
				class="min-h-[40px] cursor-pointer bg-surface p-1 transition-colors hover:bg-muted sm:min-h-[80px] sm:p-2 {date
					? ''
					: 'opacity-0'} {date && isSelected(date) ? 'ring-2 ring-primary' : ''}"
				onclick={() => date && handleDateClick(date)}
				onkeydown={(e) => e.key === 'Enter' && date && handleDateClick(date)}
				role="button"
				tabindex={date ? 0 : -1}
			>
				{#if date}
					{@const status = getDateStatus(date)}
					{@const dayReminders = getRemindersForDate(date)}
					<div class="mb-0.5 flex items-center justify-between sm:mb-1">
						<span
							class="text-[11px] sm:text-sm {isToday(date)
								? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white sm:h-6 sm:w-6'
								: 'text-fg'}"
						>
							{date.getDate()}
						</span>
						{#if dayReminders.length > 0}
							<div
								class="flex h-4 w-4 items-center justify-center rounded-full {getStatusDotColor(
									status
								)}"
							>
								<span class="text-[8px] font-bold text-white">{dayReminders.length}</span>
							</div>
						{/if}
					</div>

					{#if dayReminders.length > 0}
						<div class="hidden space-y-0.5 sm:block">
							{#each dayReminders.slice(0, 2) as r (r.id)}
								<div
									class="truncate rounded-sm px-1.5 py-0.5 text-[10px] {r.completed
										? 'bg-success/10 text-success line-through'
										: 'bg-muted text-fg'}"
									title={r.title}
								>
									{r.title}
								</div>
							{/each}
							{#if dayReminders.length > 2}
								<div class="text-center text-[9px] text-fg-subdued">
									+{dayReminders.length - 2} more
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/each}
	</div>

	<!-- Legend -->
	<div class="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-fg-subdued">
		<div class="flex items-center gap-1.5">
			<div class="h-3 w-3 rounded-full bg-success"></div>
			<span>Completed</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="h-3 w-3 rounded-full bg-error"></div>
			<span>Missed</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="h-3 w-3 rounded-full bg-warning"></div>
			<span>Partial</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="h-3 w-3 rounded-full bg-fg-subdued/30"></div>
			<span>Upcoming</span>
		</div>
	</div>
</div>
