<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';

	let {
		reminder,
		onComplete,
		onSnooze,
		onTodoToggle
	}: {
		reminder: any;
		onComplete?: (id: string) => void;
		onSnooze?: (id: string, until: Date) => void;
		onTodoToggle?: (todoId: string, completed: boolean) => void;
	} = $props();

	let showContent = $state(false);
	let renderedMarkdown = $state('');

	$effect(() => {
		if (reminder.markdown) {
			renderMarkdown(reminder.markdown).then((html) => {
				renderedMarkdown = html;
			});
		}
	});

	function formatDueTime(dueAt: Date | string): string {
		const date = new Date(dueAt);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (dueDay.getTime() === today.getTime()) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		if (dueDay.getTime() === tomorrow.getTime()) {
			return 'Tomorrow';
		}

		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function isOverdue(dueAt: Date | string): boolean {
		return new Date(dueAt) < new Date();
	}

	function handleSnooze(hours: number) {
		const until = new Date();
		until.setHours(until.getHours() + hours);
		onSnooze?.(reminder.id, until);
	}

	function handleTomorrow() {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0);
		onSnooze?.(reminder.id, tomorrow);
	}
</script>

<div class="rounded-sm border {isOverdue(reminder.dueAt) ? 'border-error/30 bg-error/5' : 'border-border bg-surface'} p-4 transition-all hover:border-primary/50">
	<div class="flex items-start justify-between gap-3">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border {reminder.completed ? 'border-success bg-success text-white' : 'border-border hover:border-primary'} transition-colors"
					onclick={() => onComplete?.(reminder.id)}
				>
					{#if reminder.completed}
						<i class="fas fa-check text-[10px]"></i>
					{/if}
				</button>
				<h3 class="text-sm font-medium {reminder.completed ? 'line-through text-fg-subdued' : 'text-fg'} truncate">
					{reminder.title}
				</h3>
			</div>

			{#if reminder.description}
				<p class="mt-1 text-xs text-fg-subdued truncate pl-7">{reminder.description}</p>
			{/if}

			<div class="mt-2 flex items-center gap-2 pl-7">
				<span class="text-[10px] {isOverdue(reminder.dueAt) ? 'text-error' : 'text-fg-subdued'}">
					{formatDueTime(reminder.dueAt)}
				</span>
				{#if isOverdue(reminder.dueAt) && !reminder.completed}
					<span class="inline-flex items-center rounded-sm bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error">
						Overdue
					</span>
				{/if}
			</div>

			{#if reminder.todos && reminder.todos.length > 0}
				<div class="mt-3 space-y-1.5 pl-7">
					{#each reminder.todos as todo}
						<label class="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={todo.completed}
								onchange={() => onTodoToggle?.(todo.id, !todo.completed)}
								class="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
							/>
							<span class="text-xs {todo.completed ? 'line-through text-fg-subdued' : 'text-fg'}">
								{todo.text}
							</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-1 shrink-0">
			{#if !reminder.completed}
				<button
					type="button"
					class="inline-flex h-7 items-center gap-1 rounded-sm bg-muted px-2 text-[11px] font-medium text-fg hover:bg-border transition-colors"
					onclick={() => handleSnooze(1)}
					title="Snooze 1 hour"
				>
					<i class="fas fa-clock text-[9px]"></i>
					1h
				</button>
				<button
					type="button"
					class="inline-flex h-7 items-center gap-1 rounded-sm bg-muted px-2 text-[11px] font-medium text-fg hover:bg-border transition-colors"
					onclick={handleTomorrow}
					title="Snooze until tomorrow"
				>
					<i class="fas fa-calendar text-[9px]"></i>
					Tom
				</button>
			{/if}

			{#if reminder.markdown}
				<button
					type="button"
					class="inline-flex h-7 w-7 items-center justify-center rounded-sm {showContent ? 'bg-primary text-white' : 'bg-muted text-fg hover:bg-border'} transition-colors"
					onclick={() => (showContent = !showContent)}
					title="Show content"
				>
					<i class="fas fa-expand text-[10px]"></i>
				</button>
			{/if}

			<a
				href="/app/reminders/{reminder.id}"
				class="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-muted text-fg hover:bg-border transition-colors"
				title="View details"
			>
				<i class="fas fa-arrow-right text-[10px]"></i>
			</a>
		</div>
	</div>

	{#if showContent && reminder.markdown}
		<div class="mt-3 border-t border-border pt-3 pl-7">
			<div class="markdown-content text-xs text-fg leading-relaxed">{@html renderedMarkdown}</div>
		</div>
	{/if}
</div>
