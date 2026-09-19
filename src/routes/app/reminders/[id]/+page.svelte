<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { EmptyState } from '$lib/components/ui';
	import { ReminderCalendar, ReminderTemplateForm } from '$lib/components/reminders';
	import { getRecurrenceLabel } from '$lib/utils/reminders';

	let { data } = $props();
	let showEditForm = $state(false);
	let renderedMarkdown = $state('');

	const isReminder = $derived(data.type === 'reminder');
	const item = $derived<any>(isReminder ? data.reminder : data.template);
	const template = $derived<any>(data.template);
	const history = $derived<any[]>(data.history ?? []);

	$effect(() => {
		if (item?.markdown) {
			renderMarkdown(item.markdown).then((html) => {
				renderedMarkdown = html;
			});
		}
	});

	async function handleComplete() {
		if (!isReminder || !item) return;

		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'completeReminder', reminderId: item.id })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function handleSnooze(hours: number) {
		if (!isReminder || !item) return;

		const until = new Date();
		until.setHours(until.getHours() + hours);

		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'snoozeReminder', reminderId: item.id, until: until.toISOString() })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function handleTodoToggle(todoId: string, completed: boolean) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTodo', todoId, completed })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function handleUpdateTemplate(formData: any) {
		const res = await fetch('/api/reminders', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTemplate', ...formData })
		});

		if (res.ok) {
			if (formData.todos) {
				await fetch('/api/reminders', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'updateTemplateTodos',
						templateId: formData.templateId,
						todos: formData.todos
					})
				});
			}

			showEditForm = false;
			await invalidateAll();
		}
	}

	function formatDueDate(dueAt: Date | string): string {
		const date = new Date(dueAt);
		return date.toLocaleDateString([], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDueTime(dueAt: Date | string): string {
		const date = new Date(dueAt);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function isOverdue(dueAt: Date | string): boolean {
		return new Date(dueAt) < new Date();
	}

	// Stats from history
	const stats = $derived(() => {
		const total = history.length;
		const completed = history.filter((r: any) => r.completed).length;
		const missed = history.filter((r: any) => !r.completed && isOverdue(r.dueAt)).length;
		const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

		return { total, completed, missed, rate };
	});
</script>

<svelte:head>
	<title>{item?.title || 'Reminder'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<!-- Breadcrumb -->
	<div class="mb-4 flex items-center gap-1.5 text-[11px] text-fg-subdued">
		<a href="/app" class="hover:text-primary" title="Home"><i class="fas fa-home text-[10px]"></i></a>
		<i class="fas fa-chevron-right text-[8px]"></i>
		<a href="/app/reminders" class="hover:text-primary">Reminders</a>
		<i class="fas fa-chevron-right text-[8px]"></i>
		<span class="text-fg truncate">{item?.title}</span>
	</div>

	{#if !item}
		<EmptyState icon="fa-exclamation-triangle" message="Reminder not found" />
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-center gap-4">
						<div
							class="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm"
							style="background-color: {template?.iconColor ? `${template.iconColor}20` : 'var(--color-primary-subdued)'}"
						>
							<i
								class="fas {template?.icon || 'fa-bell'} text-xl"
								style="color: {template?.iconColor || 'var(--color-primary)'}"
							></i>
						</div>
						<div>
							<h1 class="text-xl font-semibold text-fg-accent">{item.title}</h1>
							{#if item.description}
								<p class="mt-1 text-sm text-fg-subdued">{item.description}</p>
							{/if}
							{#if isReminder}
								<div class="mt-2 flex items-center gap-3">
									<span class="text-xs {isOverdue(item.dueAt) && !item.completed ? 'text-error' : 'text-fg-subdued'}">
										{formatDueDate(item.dueAt)} at {formatDueTime(item.dueAt)}
									</span>
									{#if item.completed}
										<span class="inline-flex items-center rounded-sm bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
											<i class="fas fa-check mr-1"></i> Completed
										</span>
									{:else if isOverdue(item.dueAt)}
										<span class="inline-flex items-center rounded-sm bg-error/10 px-2 py-0.5 text-[10px] font-medium text-error">
											Overdue
										</span>
									{/if}
								</div>
							{:else}
								<p class="mt-2 text-xs text-fg-subdued">
									{getRecurrenceLabel(item.recurrenceType, item.recurrenceConfig)}
								</p>
							{/if}
						</div>
					</div>

					<div class="flex gap-2 shrink-0">
						{#if isReminder && !item.completed}
							<button
								type="button"
								class="inline-flex h-[36px] items-center justify-center rounded-sm bg-success px-4 text-sm font-medium text-white hover:bg-success/90"
								onclick={handleComplete}
							>
								<i class="fas fa-check mr-2 text-xs"></i>
								Complete
							</button>
							<button
								type="button"
								class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg border border-border hover:border-fg-subdued"
								onclick={() => handleSnooze(1)}
							>
								<i class="fas fa-clock mr-2 text-xs"></i>
								Snooze 1h
							</button>
						{/if}
						{#if !isReminder}
							<button
								type="button"
								class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
								onclick={() => (showEditForm = true)}
							>
								<i class="fas fa-pen mr-2 text-xs"></i>
								Edit
							</button>
						{/if}
					</div>
				</div>

				<!-- Todos -->
				{#if item.todos && item.todos.length > 0}
					<div class="rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Todo Items</h3>
						<div class="space-y-2">
							{#each item.todos as todo}
								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										checked={todo.completed}
										onchange={() => handleTodoToggle(todo.id, !todo.completed)}
										class="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
									/>
									<span class="text-sm {todo.completed ? 'line-through text-fg-subdued' : 'text-fg group-hover:text-primary'} transition-colors">
										{todo.text}
									</span>
								</label>
							{/each}
						</div>
						<div class="mt-3 pt-3 border-t border-border">
							<p class="text-[10px] text-fg-subdued">
								{item.todos.filter((t: any) => t.completed).length} of {item.todos.length} completed
							</p>
						</div>
					</div>
				{/if}

				<!-- Markdown Content -->
				{#if item.markdown}
					<div class="rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Content</h3>
						<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedMarkdown}</div>
					</div>
				{/if}

				<!-- Stats Card -->
				{#if !isReminder && history.length > 0}
					{@const s = stats()}
					<div class="rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Last 30 Days Stats</h3>
						<div class="grid grid-cols-4 gap-4">
							<div class="text-center">
								<p class="text-2xl font-semibold text-fg">{s.total}</p>
								<p class="text-[10px] text-fg-subdued">Total</p>
							</div>
							<div class="text-center">
								<p class="text-2xl font-semibold text-success">{s.completed}</p>
								<p class="text-[10px] text-fg-subdued">Completed</p>
							</div>
							<div class="text-center">
								<p class="text-2xl font-semibold text-error">{s.missed}</p>
								<p class="text-[10px] text-fg-subdued">Missed</p>
							</div>
							<div class="text-center">
								<p class="text-2xl font-semibold {s.rate >= 80 ? 'text-success' : s.rate >= 50 ? 'text-warning' : 'text-error'}">{s.rate}%</p>
								<p class="text-[10px] text-fg-subdued">Rate</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Calendar -->
				<div>
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Habit Tracking</h3>
					<ReminderCalendar reminders={history} />
				</div>

				<!-- Template Info (for reminders) -->
				{#if isReminder && template}
					<div class="rounded-sm border border-border bg-surface p-4">
						<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Template</h3>
						<a
							href="/app/reminders/{template.id}"
							class="flex items-center gap-3 rounded-sm p-2 hover:bg-muted transition-colors"
						>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-sm"
								style="background-color: {template.iconColor ? `${template.iconColor}20` : 'var(--color-primary-subdued)'}"
							>
								<i
									class="fas {template.icon || 'fa-bell'} text-xs"
									style="color: {template.iconColor || 'var(--color-primary)'}"
								></i>
							</div>
							<div>
								<p class="text-sm font-medium text-fg">{template.title}</p>
								<p class="text-[10px] text-fg-subdued">
									{getRecurrenceLabel(template.recurrenceType, template.recurrenceConfig)}
								</p>
							</div>
						</a>
					</div>
				{/if}

				<!-- Details -->
				<div class="rounded-sm border border-border bg-surface p-4">
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Details</h3>
					<dl class="space-y-2 text-xs">
						<div class="flex justify-between">
							<dt class="text-fg-subdued">Type</dt>
							<dd class="text-fg capitalize">{isReminder ? 'Reminder Instance' : 'Template'}</dd>
						</div>
						{#if item.createdAt}
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Created</dt>
								<dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd>
							</div>
						{/if}
						{#if item.updatedAt}
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Updated</dt>
								<dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd>
							</div>
						{/if}
						{#if isReminder && item.completedAt}
							<div class="flex justify-between">
								<dt class="text-fg-subdued">Completed</dt>
								<dd class="text-fg">{new Date(item.completedAt).toLocaleString()}</dd>
							</div>
						{/if}
					</dl>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if !isReminder && template}
	<ReminderTemplateForm
		bind:open={showEditForm}
		template={template}
		onSave={handleUpdateTemplate}
		onClose={() => (showEditForm = false)}
	/>
{/if}
