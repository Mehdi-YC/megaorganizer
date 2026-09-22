<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Badge, Button, Checkbox } from '$lib/components/ui';

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

<div
	class="rounded-sm border {isOverdue(reminder.dueAt)
		? 'border-error/30 bg-error/5'
		: 'border-border bg-surface'} p-4 transition-all hover:border-primary/50"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border {reminder.completed
						? 'border-success bg-success text-white'
						: 'border-border hover:border-primary'} transition-colors"
					onclick={() => onComplete?.(reminder.id)}
					aria-label="Toggle complete"
				>
					{#if reminder.completed}
						<i class="fas fa-check text-[10px]"></i>
					{/if}
				</button>
				<h3
					class="text-sm font-medium {reminder.completed
						? 'text-fg-subdued line-through'
						: 'text-fg'} truncate"
				>
					{reminder.title}
				</h3>
			</div>

			{#if reminder.description}
				<p class="mt-1 truncate pl-7 text-xs text-fg-subdued">{reminder.description}</p>
			{/if}

			<div class="mt-2 flex items-center gap-2 pl-7">
				<span class="text-[10px] {isOverdue(reminder.dueAt) ? 'text-error' : 'text-fg-subdued'}">
					{formatDueTime(reminder.dueAt)}
				</span>
				{#if isOverdue(reminder.dueAt) && !reminder.completed}
					<Badge variant="danger" size="sm">Overdue</Badge>
				{/if}
			</div>

			{#if reminder.todos && reminder.todos.length > 0}
				<div class="mt-3 space-y-1.5 pl-7">
					{#each reminder.todos as todo (todo.id)}
						<Checkbox
							checked={todo.completed}
							onchange={() => onTodoToggle?.(todo.id, !todo.completed)}
							label={todo.text}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1">
			{#if !reminder.completed}
				<Button variant="secondary" size="sm" onclick={() => handleSnooze(1)} title="Snooze 1 hour">
					<i class="fas fa-clock text-[9px]"></i>
					1h
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onclick={handleTomorrow}
					title="Snooze until tomorrow"
				>
					<i class="fas fa-calendar text-[9px]"></i>
					Tom
				</Button>
			{/if}

			{#if reminder.markdown}
				<button
					type="button"
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm {showContent
						? 'bg-primary text-white'
						: 'bg-muted text-fg hover:bg-border'} transition-colors"
					onclick={() => (showContent = !showContent)}
					title="Show content"
					aria-label="Show content"
				>
					<i class="fas fa-expand text-[10px]"></i>
				</button>
			{/if}

			<a
				href="/app/reminders/{reminder.id}"
				class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-border"
				title="View details"
				aria-label="View details"
			>
				<i class="fas fa-arrow-right text-[10px]"></i>
			</a>
		</div>
	</div>

	{#if showContent && reminder.markdown}
		<div class="mt-3 border-t border-border pt-3 pl-7">
			<div class="markdown-content text-xs leading-relaxed text-fg">{@html renderedMarkdown}</div>
		</div>
	{/if}
</div>
