<script lang="ts">
	import { getSessionIcon } from '$lib/utils/training';
	import { ReminderCard } from '$lib/components/reminders';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let dueReminders = $state<any[]>(data.dueReminders ?? []);

	function formatDuration(seconds: number) {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
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

	function getEventsForDay(day: Date, events: any[]): any[] {
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
		}
	}

	async function handleTodoToggle(todoId: string, completed: boolean) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTodo', todoId, completed })
		});
		if (res.ok) {
			dueReminders = dueReminders.map((r: any) => ({
				...r,
				todos: r.todos.map((t: any) => (t.id === todoId ? { ...t, completed } : t))
			}));
		}
	}
</script>

<svelte:head>
	<title>Dashboard - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-fg-accent">Dashboard</h1>
		<p class="mt-1 text-sm text-fg-subdued">Your personal knowledge & activity operating system</p>
	</div>

	<!-- Today's Reminders -->
	{#if dueReminders.length > 0}
		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide flex items-center gap-2">
					<i class="fas fa-bell text-primary text-xs"></i>
					Today's Reminders
				</h2>
				<a href="/app/reminders" class="text-xs text-primary hover:text-primary-hover">View All</a>
			</div>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each dueReminders as reminder}
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

	<!-- Upcoming Events -->
	{#if data.upcomingEvents && data.upcomingEvents.length > 0}
		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide flex items-center gap-2">
					<i class="fas fa-calendar-week text-primary text-xs"></i>
					Upcoming This Week
				</h2>
				<a href="/app/calendar" class="text-xs text-primary hover:text-primary-hover">View Calendar</a>
			</div>
			<div class="flex gap-1 overflow-x-auto pb-2">
				{#each getWeekDays() as day}
					{@const dayEvents = getEventsForDay(day, data.upcomingEvents ?? [])}
					{@const isToday = isSameDay(day, new Date())}
					<div class="flex flex-col items-center min-w-[60px] rounded-sm border {isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface'} p-2">
						<span class="text-[10px] font-medium {isToday ? 'text-primary' : 'text-fg-subdued'}">{day.toLocaleDateString([], { weekday: 'short' })}</span>
						<span class="text-sm font-semibold {isToday ? 'text-primary' : 'text-fg'}">{day.getDate()}</span>
						<div class="flex gap-0.5 mt-1">
							{#each dayEvents.slice(0, 3) as event}
								<a
									href={event.type === 'training' ? `/app/training/session/${event.id}` : `/app/reminders/${event.id}`}
									class="h-2 w-2 rounded-full {event.type === 'training' ? 'bg-blue-500' : 'bg-green-500'}"
									title={event.title}
								></a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Stats -->
	<div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
		<a href="/app/library" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-cubes text-sm text-primary"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.stats?.itemCount ?? 0}</p>
			<p class="text-xs text-fg-subdued">Items</p>
		</a>

		<a href="/app/training" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-green-500/10">
				<i class="fas fa-calendar-check text-sm text-green-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.stats?.sessionCount ?? 0}</p>
			<p class="text-xs text-fg-subdued">Sessions</p>
		</a>

		<a href="/app/training/history" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-orange-500/10">
				<i class="fas fa-clock text-sm text-orange-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{formatDuration(data.stats?.totalDuration ?? 0)}</p>
			<p class="text-xs text-fg-subdued">Total Time</p>
		</a>

		<a href="/app/tags" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-purple-500/10">
				<i class="fas fa-tags text-sm text-purple-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.categories?.length ?? 0}</p>
			<p class="text-xs text-fg-subdued">Categories</p>
		</a>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		<!-- Recent Items -->
		<div class="lg:col-span-2">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Items</h2>
				<a href="/app/library" class="text-xs text-primary hover:text-primary-hover">View All</a>
			</div>
			{#if data.recentItems && data.recentItems.length > 0}
				<div class="grid gap-2 grid-cols-2 sm:grid-cols-3">
					{#each data.recentItems as item}
						<a href="/app/item/{item.id}" class="group flex items-center gap-3 rounded-sm border {item.favorite ? 'border-yellow-400/40 bg-yellow-500/5' : 'border-border bg-surface'} p-3 transition-all hover:border-primary/50">
							{#if item.imageUrl}
								<img src={item.imageUrl} alt="" class="h-10 w-10 rounded-sm object-cover shrink-0" />
							{:else}
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
									<i class="fas {item.favorite ? 'fa-star text-yellow-400' : 'fa-cube text-fg-subdued'} text-sm"></i>
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1">
									<p class="flex-1 truncate text-sm font-medium text-fg group-hover:text-primary">{item.name}</p>
									{#if item.favorite}
										<i class="fas fa-star text-[10px] text-yellow-400 shrink-0"></i>
									{/if}
								</div>
								<p class="text-[10px] text-fg-subdued capitalize">{item.type}</p>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-sm border border-dashed border-border py-8 text-center">
					<i class="fas fa-cube mb-2 text-2xl text-fg-subdued/30"></i>
					<p class="text-sm text-fg-subdued">No items yet</p>
					<a href="/app/library" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Create your first item</a>
				</div>
			{/if}
		</div>

		<!-- Categories -->
		<div>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Categories</h2>
				<a href="/app/category/new" class="text-xs text-primary hover:text-primary-hover">Add New</a>
			</div>
			{#if data.categories && data.categories.length > 0}
				<div class="space-y-1.5">
					{#each data.categories as cat}
						<a href="/app/category/{cat.id}" class="flex items-center gap-2.5 rounded-sm border border-border bg-surface px-3 py-2.5 transition-all hover:border-primary/50">
							{#if cat.icon}
								<i class="fas {cat.icon} text-sm" style="color: {cat.iconColor || 'var(--color-primary)'}"></i>
							{:else}
								<i class="fas fa-folder text-sm text-fg-subdued"></i>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-fg">{cat.name}</p>
								{#if cat.pages && cat.pages.length > 0}
									<p class="text-[10px] text-fg-subdued">{cat.pages.length} page{cat.pages.length !== 1 ? 's' : ''}</p>
								{/if}
							</div>
							<i class="fas fa-chevron-right text-[9px] text-fg-subdued/50"></i>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-sm border border-dashed border-border py-8 text-center">
					<i class="fas fa-folder mb-2 text-2xl text-fg-subdued/30"></i>
					<p class="text-sm text-fg-subdued">No categories yet</p>
					<a href="/app/category/new" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Create your first category</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent Training -->
	<div class="mt-6">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Training</h2>
			<div class="flex gap-3">
				<a href="/app/training/session/new" class="text-xs text-primary hover:text-primary-hover">New Session</a>
				<a href="/app/training/history" class="text-xs text-primary hover:text-primary-hover">View All</a>
			</div>
		</div>
		{#if data.recentSessions && data.recentSessions.length > 0}
			<div class="space-y-1.5">
				{#each data.recentSessions as session}
					{@const icon = getSessionIcon(session.activityTypes)}
					<a href="/app/training/session/{session.id}" class="flex items-center justify-between rounded-sm border border-border bg-surface p-3 transition-all hover:border-primary/50">
						<div class="flex items-center gap-3">
							<div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
								<i class="fas {icon.icon} {icon.color} text-sm"></i>
							</div>
							<div>
								<p class="text-sm font-medium text-fg">{session.title || 'Training Session'}</p>
								<p class="text-[10px] text-fg-subdued">
									{new Date(session.startedAt).toLocaleDateString()}
									{#if session.duration} · {formatDuration(session.duration)}{/if}
								</p>
							</div>
						</div>
						<i class="fas fa-chevron-right text-[9px] text-fg-subdued/50"></i>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-sm border border-dashed border-border py-8 text-center">
				<i class="fas fa-dumbbell mb-2 text-2xl text-fg-subdued/30"></i>
				<p class="text-sm text-fg-subdued">No training sessions yet</p>
				<a href="/app/training/session/new" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Start your first session</a>
			</div>
		{/if}
	</div>
</div>
