<script lang="ts">
	import type { Reminder } from '$lib/types';
	import { resolve } from '$app/paths';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Badge, Button, Checkbox } from '$lib/components/ui';

	let {
		reminder,
		onComplete,
		onSnooze,
		onTodoToggle
	}: {
		reminder: Reminder;
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
			return 'Demain';
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
	class="group relative flex flex-col justify-between rounded-xl border {isOverdue(
		reminder.dueAt
	) && !reminder.completed
		? 'border-error/40 bg-error/5'
		: 'border-border bg-surface'} p-4 shadow-xs transition-all hover:border-border-strong hover:shadow-sm"
>
	<div>
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 flex-1 items-start gap-2.5">
				<button
					type="button"
					class="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors {reminder.completed
						? 'border-success bg-success text-white'
						: 'border-border-strong hover:border-fg-subdued'}"
					onclick={() => onComplete?.(reminder.id)}
					aria-label="Toggle complete"
				>
					{#if reminder.completed}
						<i class="fas fa-check text-[8px]"></i>
					{/if}
				</button>
				<div class="min-w-0 flex-1">
					<h3
						class="text-sm font-semibold tracking-tight {reminder.completed
							? 'text-fg-subdued line-through'
							: 'text-fg'} truncate"
					>
						{reminder.title}
					</h3>
					{#if reminder.description}
						<p class="mt-0.5 truncate text-xs text-fg-subdued">{reminder.description}</p>
					{/if}
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-1.5">
				{#if reminder.markdown}
					<button
						type="button"
						class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg {showContent
							? 'bg-primary text-white'
							: 'bg-muted text-fg-subdued hover:text-fg'} transition-colors"
						onclick={() => (showContent = !showContent)}
						title="Afficher le contenu"
						aria-label="Afficher le contenu"
					>
						<i class="fas fa-expand text-[10px]"></i>
					</button>
				{/if}

				<a
					href={resolve('/app/reminders/[id]', { id: reminder.id })}
					class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-muted text-fg-subdued transition-colors hover:text-fg"
					title="Voir détails"
					aria-label="Voir détails"
				>
					<i class="fas fa-chevron-right text-[10px]"></i>
				</a>
			</div>
		</div>

		<div class="mt-2.5 flex items-center gap-2">
			<span
				class="text-xs {isOverdue(reminder.dueAt) && !reminder.completed
					? 'font-medium text-error'
					: 'text-fg-subdued'}"
			>
				<i class="far fa-clock mr-1 text-[10px]"></i>
				{formatDueTime(reminder.dueAt)}
			</span>
			{#if isOverdue(reminder.dueAt) && !reminder.completed}
				<Badge variant="danger" size="sm">En retard</Badge>
			{/if}
		</div>

		{#if reminder.todos && reminder.todos.length > 0}
			<div class="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
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

	{#if !reminder.completed}
		<div class="mt-3.5 flex items-center justify-end gap-1.5 border-t border-border/50 pt-2.5">
			<Button
				variant="secondary"
				size="xs"
				onclick={() => handleSnooze(1)}
				title="Reporter de 1 heure"
			>
				<i class="fas fa-clock mr-1 text-[9px]"></i>
				+1h
			</Button>
			<Button variant="secondary" size="xs" onclick={handleTomorrow} title="Reporter à demain">
				<i class="fas fa-calendar mr-1 text-[9px]"></i>
				Demain
			</Button>
		</div>
	{/if}

	{#if showContent && reminder.markdown}
		<div class="mt-3 border-t border-border pt-3">
			<div class="markdown-content text-xs leading-relaxed text-fg">{@html renderedMarkdown}</div>
		</div>
	{/if}
</div>
