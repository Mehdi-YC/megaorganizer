<script lang="ts">
	import { Button, Input, Textarea, Dialog } from '$lib/components/ui';

	let {
		open = $bindable(false),
		template = null,
		onSave,
		onClose
	}: {
		open?: boolean;
		template?: any;
		onSave?: (data: any) => void;
		onClose?: () => void;
	} = $props();

	let title = $state('');
	let description = $state('');
	let markdown = $state('');
	let icon = $state('fa-bell');
	let iconColor = $state('');
	let recurrenceType = $state<'daily' | 'weekly' | 'monthly' | 'yearly' | 'yearly_date' | 'monthly_relative'>('daily');
	let hour = $state(9);
	let minute = $state(0);
	let selectedDays = $state<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
	let dayOfMonth = $state(1);
	let todos = $state<string[]>([]);
	let newTodo = $state('');

	// Initialize from template when it changes
	$effect(() => {
		if (template) {
			title = template.title ?? '';
			description = template.description ?? '';
			markdown = template.markdown ?? '';
			icon = template.icon ?? 'fa-bell';
			iconColor = template.iconColor ?? '';
			recurrenceType = template.recurrenceType ?? 'daily';
			todos = template.todos?.map((t: any) => t.text) ?? [];

			// Parse config
			if (template.recurrenceConfig) {
				try {
					const config = JSON.parse(template.recurrenceConfig);
					if (config.hour !== undefined) hour = config.hour;
					if (config.minute !== undefined) minute = config.minute;
					if (config.days) selectedDays = config.days;
					if (config.dayOfMonth) dayOfMonth = config.dayOfMonth;
				} catch {}
			}
		}
	});

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const iconOptions = [
		'fa-bell', 'fa-clock', 'fa-calendar', 'fa-calendar-check',
		'fa-calendar-day', 'fa-alarm-clock', 'fa-stopwatch',
		'fa-dumbbell', 'fa-book', 'fa-code', 'fa-heart', 'fa-star'
	];

	const recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly', 'yearly_date', 'monthly_relative'] as const;
	
	const recurrenceLabels: Record<string, string> = {
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		yearly: 'Yearly',
		yearly_date: 'Yearly (Specific Date)',
		monthly_relative: 'Monthly (Relative)'
	};

	// For yearly_date
	let yearlyMonth = $state(0);
	let yearlyDay = $state(1);
	
	// For monthly_relative
	let relativeWeekday = $state(1); // Monday
	let relativeOrdinal = $state(-1); // Last

	function toggleDay(day: number) {
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter((d) => d !== day);
		} else {
			selectedDays = [...selectedDays, day].sort();
		}
	}

	function addTodo() {
		if (newTodo.trim()) {
			todos = [...todos, newTodo.trim()];
			newTodo = '';
		}
	}

	function removeTodo(index: number) {
		todos = todos.filter((_, i) => i !== index);
	}

	function buildRecurrenceConfig(): string {
		const config: any = { hour, minute };

		if (recurrenceType === 'weekly') {
			config.days = selectedDays;
		} else if (recurrenceType === 'monthly') {
			config.dayOfMonth = dayOfMonth;
		} else if (recurrenceType === 'yearly_date') {
			config.month = yearlyMonth;
			config.day = yearlyDay;
		} else if (recurrenceType === 'monthly_relative') {
			config.weekday = relativeWeekday;
			config.weekdayOrdinal = relativeOrdinal;
		}

		return JSON.stringify(config);
	}

	function calculateInitialNextDueAt(): Date {
		const now = new Date();
		const next = new Date(now);
		next.setHours(hour, minute, 0, 0);

		if (next <= now) {
			next.setDate(next.getDate() + 1);
		}

		if (recurrenceType === 'weekly') {
			while (!selectedDays.includes(next.getDay())) {
				next.setDate(next.getDate() + 1);
			}
		} else if (recurrenceType === 'monthly') {
			next.setDate(dayOfMonth);
			if (next <= now) {
				next.setMonth(next.getMonth() + 1);
			}
		}

		return next;
	}

	function handleSave() {
		if (!title.trim()) return;

		const data: any = {
			title: title.trim(),
			description: description.trim() || undefined,
			markdown: markdown.trim() || undefined,
			icon,
			iconColor: iconColor || undefined,
			recurrenceType,
			recurrenceConfig: buildRecurrenceConfig(),
			nextDueAt: calculateInitialNextDueAt().toISOString(),
			todos
		};

		if (template) {
			data.templateId = template.id;
		}

		onSave?.(data);
		open = false;
	}

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open title={template ? 'Edit Reminder Template' : 'Create Reminder Template'} onclose={handleClose}>
	<div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
		<!-- Title -->
		<div>
			<Input
				label="TITLE *"
				bind:value={title}
				placeholder="e.g., Morning Workout"
			/>
		</div>

		<!-- Description -->
		<div>
			<Input
				label="DESCRIPTION"
				bind:value={description}
				placeholder="Short description (optional)"
			/>
		</div>

		<!-- Icon & Color -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="reminder-icon" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
					ICON
				</label>
				<select
					id="reminder-icon"
					bind:value={icon}
					class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
				>
					{#each iconOptions as iconOpt}
						<option value={iconOpt}>
							{iconOpt.replace('fa-', '').replace('-', ' ')}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="reminder-color" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
					COLOR
				</label>
				<div class="flex items-center gap-2">
					<input
						type="color"
						id="reminder-color"
						bind:value={iconColor}
						class="h-[36px] w-10 rounded-sm border border-border cursor-pointer"
					/>
					<input
						type="text"
						bind:value={iconColor}
						placeholder="#000000"
						class="flex-1 h-[36px] rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
					/>
				</div>
			</div>
		</div>

		<!-- Recurrence Type -->
		<div>
			<span class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
				RECURRENCE
			</span>
			<div class="grid grid-cols-3 gap-1.5">
				{#each recurrenceTypes as type}
					<button
						type="button"
						class="rounded-sm px-2 py-2 text-[11px] font-medium transition-colors {recurrenceType === type ? 'bg-primary text-white' : 'bg-muted text-fg hover:bg-border'}"
						onclick={() => (recurrenceType = type)}
					>
						{recurrenceLabels[type] || type}
					</button>
				{/each}
			</div>
		</div>

		<!-- Time -->
		<div>
			<span class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
				TIME
			</span>
			<div class="flex items-center gap-2">
				<select
					bind:value={hour}
					class="h-[36px] flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
				>
					{#each Array(24) as _, i}
						<option value={i}>{i.toString().padStart(2, '0')}</option>
					{/each}
				</select>
				<span class="text-fg-subdued">:</span>
				<select
					bind:value={minute}
					class="h-[36px] flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
				>
					{#each [0, 15, 30, 45] as m}
						<option value={m}>{m.toString().padStart(2, '0')}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Weekly: Day Selection -->
		{#if recurrenceType === 'weekly'}
			<div>
				<span class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
					DAYS
				</span>
				<div class="flex gap-1.5">
					{#each dayNames as day, i}
						<button
							type="button"
							class="flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors {selectedDays.includes(i) ? 'bg-primary text-white' : 'bg-muted text-fg hover:bg-border'}"
							onclick={() => toggleDay(i)}
						>
							{day}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Monthly: Day of Month -->
		{#if recurrenceType === 'monthly'}
			<div>
				<label for="day-of-month" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
					DAY OF MONTH
				</label>
				<select
					id="day-of-month"
					bind:value={dayOfMonth}
					class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
				>
					{#each Array(31) as _, i}
						<option value={i + 1}>{i + 1}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Yearly Date: Month and Day -->
		{#if recurrenceType === 'yearly_date'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="yearly-month" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
						MONTH
					</label>
					<select
						id="yearly-month"
						bind:value={yearlyMonth}
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
					>
						{#each ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as month, i}
							<option value={i}>{month}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="yearly-day" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
						DAY
					</label>
					<select
						id="yearly-day"
						bind:value={yearlyDay}
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
					>
						{#each Array(31) as _, i}
							<option value={i + 1}>{i + 1}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		<!-- Monthly Relative: Weekday and Ordinal -->
		{#if recurrenceType === 'monthly_relative'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="relative-weekday" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
						WEEKDAY
					</label>
					<select
						id="relative-weekday"
						bind:value={relativeWeekday}
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
					>
						{#each dayNames as day, i}
							<option value={i}>{day}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="relative-ordinal" class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
						OCCURRENCE
					</label>
					<select
						id="relative-ordinal"
						bind:value={relativeOrdinal}
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none"
					>
						<option value={1}>First</option>
						<option value={2}>Second</option>
						<option value={3}>Third</option>
						<option value={4}>Fourth</option>
						<option value={-1}>Last</option>
					</select>
				</div>
			</div>
		{/if}

		<!-- Todos -->
		<div>
			<span class="block text-xs font-semibold text-fg-accent tracking-wide mb-1.5">
				TODO ITEMS
			</span>
			<div class="space-y-1.5">
				{#each todos as todo, i}
					<div class="flex items-center gap-2">
						<span class="flex-1 text-sm text-fg">{todo}</span>
						<button
							type="button"
							class="inline-flex h-6 w-6 items-center justify-center rounded-sm text-fg-subdued hover:text-error hover:bg-error/10 transition-colors"
							onclick={() => removeTodo(i)}
							title="Remove todo"
						>
							<i class="fas fa-times text-[10px]"></i>
						</button>
					</div>
				{/each}
			</div>
			<div class="mt-2 flex gap-2">
				<input
					type="text"
					bind:value={newTodo}
					placeholder="Add todo item..."
					class="flex-1 h-[36px] rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
					onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && addTodo()}
				/>
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg border border-border hover:border-fg-subdued"
					onclick={addTodo}
					aria-label="Add todo"
				>
					<i class="fas fa-plus text-[10px]"></i>
				</button>
			</div>
		</div>

		<!-- Markdown Content -->
		<div>
			<Textarea
				label="CONTENT (MARKDOWN)"
				bind:value={markdown}
				placeholder="Write detailed content here... (supports markdown)"
				rows={6}
			/>
		</div>
	</div>

	<div class="mt-4 flex justify-end gap-2">
		<button
			type="button"
			class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg border border-border hover:border-fg-subdued"
			onclick={handleClose}
		>
			Cancel
		</button>
		<button
			type="button"
			class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={handleSave}
			disabled={!title.trim()}
		>
			{template ? 'Update' : 'Create'} Template
		</button>
	</div>
</Dialog>
