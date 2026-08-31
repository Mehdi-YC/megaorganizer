<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();
	let currentDate = $state(new Date());
	let sessions = $state(data.sessions ?? []);

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	const activityIcons: Record<string, { icon: string; color: string }> = {
		strength: { icon: 'fa-dumbbell', color: 'text-blue-500' },
		running: { icon: 'fa-person-running', color: 'text-green-500' },
		cycling: { icon: 'fa-bicycle', color: 'text-orange-500' },
		walking: { icon: 'fa-person-walking', color: 'text-yellow-500' },
		swimming: { icon: 'fa-person-swimming', color: 'text-cyan-500' },
		other: { icon: 'fa-circle-dot', color: 'text-fg-subdued' }
	};

	function getSessionIcon(activityTypes: string[]) {
		if (!activityTypes || activityTypes.length === 0) return activityIcons.other;
		return activityIcons[activityTypes[0]] ?? activityIcons.other;
	}

	function getDaysInMonth(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDay = (firstDay.getDay() + 6) % 7;

		const days = [];
		for (let i = 0; i < startDay; i++) {
			days.push(null);
		}
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(new Date(year, month, i));
		}
		return days;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
	}

	function getSessionsForDate(date: Date) {
		return sessions.filter((s) => {
			const sessionDate = new Date(s.startedAt);
			return (
				sessionDate.getFullYear() === date.getFullYear() &&
				sessionDate.getMonth() === date.getMonth() &&
				sessionDate.getDate() === date.getDate()
			);
		});
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
	}
</script>

<svelte:head>
	<title>Training Calendar - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6 sm:mb-8">
		<h1 class="text-lg font-semibold text-fg-accent">Training Calendar</h1>
		<p class="mt-2 text-fg-subdued">Track your training sessions</p>
	</div>

	<div class="rounded-sm border border-border bg-surface p-3 sm:p-6">
		<div class="mb-4 sm:mb-6 flex items-center justify-between">
			<button
				type="button"
				class="rounded-sm px-3 py-2 text-sm font-medium text-fg hover:bg-muted"
				onclick={prevMonth}
			>
				<i class="fas fa-chevron-left"></i>
			</button>
			<h2 class="text-lg font-semibold text-fg">
				{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
			</h2>
			<button
				type="button"
				class="rounded-sm px-3 py-2 text-sm font-medium text-fg hover:bg-muted"
				onclick={nextMonth}
			>
				<i class="fas fa-chevron-right"></i>
			</button>
		</div>

		<div class="grid grid-cols-7 gap-px bg-border">
			{#each dayNames as day}
				<div class="bg-muted px-1 sm:px-2 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold uppercase text-fg-subdued">
					{day}
				</div>
			{/each}

			{#each getDaysInMonth(currentDate) as date}
				<div class="min-h-[40px] sm:min-h-[100px] bg-surface p-1 sm:p-2 {date ? '' : 'opacity-0'}">
					{#if date}
						<div class="mb-0.5 sm:mb-1 flex items-center justify-between">
							<span
								class="text-[11px] sm:text-sm {isToday(date)
									? 'flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-white'
									: 'text-fg'}"
							>
								{date.getDate()}
							</span>
						</div>

						{#each getSessionsForDate(date) as session}
							{@const icon = getSessionIcon(session.activityTypes)}
							<a
								href="/app/training/session/{session.id}"
								class="mb-1 flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
							>
								<i class="fas {icon.icon} {icon.color} text-[10px]"></i>
								{session.title || 'Training'}
							</a>
						{/each}
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="mt-8">
		<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Sessions</h2>
		<a
			href="/app/training/session/new"
			class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
			>
				<i class="fas fa-plus mr-2"></i>
				Start Training
			</a>
		</div>

		{#if sessions.length === 0}
		<div class="mt-8 rounded-sm border border-border bg-surface p-12 text-center">
			<i class="fas fa-dumbbell mb-4 text-4xl text-fg-subdued"></i>
			<p class="text-fg-subdued">No training sessions yet</p>
			<a
				href="/app/training/session/new"
				class="mt-4 inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
				>
					Start Your First Session
				</a>
			</div>
		{:else}
			<div class="mt-4 space-y-2">
				{#each sessions.slice(0, 10) as session}
					{@const icon = getSessionIcon(session.activityTypes)}
					<a
						href="/app/training/session/{session.id}"
				class="flex items-center justify-between rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
			>
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
						<i class="fas {icon.icon} {icon.color}"></i>
					</div>
					<div>
						<p class="font-medium text-fg">{session.title || 'Training Session'}</p>
						<p class="text-sm text-fg-subdued">
								{new Date(session.startedAt).toLocaleDateString()} ·
								{session.duration ? `${Math.floor(session.duration / 60)}m` : 'In progress'}
							</p>
						</div>
					</div>
					<i class="fas fa-chevron-right text-fg-subdued"></i>
				</a>
			{/each}
		</div>
	{/if}
	</div>
</div>
