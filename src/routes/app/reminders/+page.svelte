<script lang="ts">
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import { invalidateAll } from '$app/navigation';
	import { Button, EmptyState } from '$lib/components/ui';
	import { ReminderTemplateForm } from '$lib/components/reminders';
	import { getRecurrenceLabel } from '$lib/utils/reminders';

	let { data } = $props();
	let templates = $derived(data.templates ?? []);
	let showCreateForm = $state(false);
	let editingTemplate = $state<any>(null);

		daily: 'fa-calendar-day',
		weekly: 'fa-calendar-week',
		monthly: 'fa-calendar',
		yearly: 'fa-calendar-days',
		yearly_date: 'fa-calendar-days',
		monthly_relative: 'fa-calendar-week'
	};

	async function handleCreateTemplate(formData: any) {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createTemplate', ...formData })
		});

		if (res.ok) {
			showCreateForm = false;
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
			// Update todos if provided
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

			editingTemplate = null;
			await invalidateAll();
		}
	}

	async function toggleTemplateActive(templateId: string, active: boolean) {
		const res = await fetch('/api/reminders', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTemplate', templateId, active })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}

	async function deleteTemplate(templateId: string) {
		if (
			!(await confirmAction(
				'Delete this reminder template? All associated reminders will also be deleted.'
			))
		)
			return;

		const res = await fetch('/api/reminders', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteTemplate', templateId })
		});

		if (res.ok) {
			await invalidateAll();
		}
	}
</script>

<svelte:head>
	<title>Reminders - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-fg-accent">Reminders</h1>
			<p class="mt-1 text-sm text-fg-subdued">Manage your recurring reminders</p>
		</div>
		<div class="flex gap-2">
			<Button variant="secondary" size="md" href="/app/reminders/history">
				<i class="fas fa-chart-bar mr-2 text-xs"></i>
				History
			</Button>
			<Button variant="primary" size="md" onclick={() => (showCreateForm = true)}>
				<i class="fas fa-plus mr-2 text-xs"></i>
				New Template
			</Button>
		</div>
	</div>

	{#if templates.length === 0}
		<EmptyState
			icon="fa-bell"
			message="No reminder templates yet"
			submessage="Create a template to start receiving recurring reminders"
		>
			<Button variant="primary" size="md" onclick={() => (showCreateForm = true)}>
				<i class="fas fa-plus mr-2 text-xs"></i>
				Create Template
			</Button>
		</EmptyState>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each templates as template (template.id)}
				<div
					class="rounded-sm border {template.active
						? 'border-border'
						: 'border-border/50 opacity-60'} bg-surface p-4 transition-all hover:border-primary/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
								style="background-color: {template.iconColor
									? `${template.iconColor}20`
									: 'var(--color-primary-subdued)'}"
							>
								<i
									class="fas {template.icon || 'fa-bell'} text-sm"
									style="color: {template.iconColor || 'var(--color-primary)'}"
								></i>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-sm font-medium text-fg">{template.title}</h3>
								<p class="mt-0.5 text-[10px] text-fg-subdued">
									{getRecurrenceLabel(template.recurrenceType, template.recurrenceConfig)}
								</p>
							</div>
						</div>

						<div class="flex shrink-0 items-center gap-1">
							<button
								type="button"
								class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm {template.active
									? 'bg-success/10 text-success'
									: 'bg-muted text-fg-subdued'} transition-colors hover:bg-border"
								onclick={() => toggleTemplateActive(template.id, !template.active)}
								title={template.active ? 'Deactivate' : 'Activate'}
								aria-label={template.active ? 'Deactivate' : 'Activate'}
							>
								<i class="fas {template.active ? 'fa-pause' : 'fa-play'} text-[10px]"></i>
							</button>
							<button
								type="button"
								class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-border"
								onclick={() => (editingTemplate = template)}
								title="Edit"
								aria-label="Edit"
							>
								<i class="fas fa-pen text-[10px]"></i>
							</button>
							<button
								type="button"
								class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-error/10 hover:text-error"
								onclick={() => deleteTemplate(template.id)}
								title="Delete"
								aria-label="Delete"
							>
								<i class="fas fa-trash text-[10px]"></i>
							</button>
						</div>
					</div>

					{#if template.description}
						<p class="mt-2 line-clamp-2 text-xs text-fg-subdued">{template.description}</p>
					{/if}

					{#if template.todos && template.todos.length > 0}
						<div class="mt-3 border-t border-border pt-3">
							<p class="mb-1.5 text-[10px] font-semibold tracking-wide text-fg-subdued uppercase">
								{template.todos.length} todo{template.todos.length !== 1 ? 's' : ''}
							</p>
							<div class="space-y-1">
								{#each template.todos.slice(0, 3) as todo (todo.id)}
									<p class="truncate text-xs text-fg">• {todo.text}</p>
								{/each}
								{#if template.todos.length > 3}
									<p class="text-[10px] text-fg-subdued">+{template.todos.length - 3} more</p>
								{/if}
							</div>
						</div>
					{/if}

					{#if template.nextDueAt}
						<div class="mt-3 flex items-center justify-between border-t border-border pt-3">
							<span class="text-[10px] text-fg-subdued">Next due:</span>
							<span class="text-xs text-fg">
								{new Date(template.nextDueAt).toLocaleDateString([], {
									month: 'short',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<ReminderTemplateForm bind:open={showCreateForm} onSave={handleCreateTemplate} />

{#if editingTemplate}
	<ReminderTemplateForm
		open={true}
		template={editingTemplate}
		onSave={handleUpdateTemplate}
		onClose={() => (editingTemplate = null)}
	/>
{/if}
