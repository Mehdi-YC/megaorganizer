<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { formatTime, formatPace } from '$lib/utils';

	let { data } = $props();
	let session = $state(data.session);
	let activities = $state(data.activities ?? []);
	let editing = $state(false);
	let title = $state(session?.title ?? '');
	let notes = $state(session?.notes ?? '');

	async function saveSession() {
		if (!session) return;

		const response = await fetch('/api/training', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'updateSession',
				sessionId: session.id,
				title,
				notes
			})
		});

		if (response.ok) {
			editing = false;
			session = { ...session, title, notes };
		}
	}

	async function deleteSession() {
		if (!confirm('Are you sure you want to delete this session?')) return;

		const response = await fetch('/api/training', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'deleteSession',
				sessionId: session?.id
			})
		});

		if (response.ok) {
			goto('/app/training/calendar');
		}
	}
</script>

<svelte:head>
	<title>{session?.title || 'Training Session'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	{#if !session}
		<div class="rounded-sm border border-border bg-surface py-16 text-center">
			<i class="fas fa-exclamation-triangle mb-4 text-4xl text-fg-subdued"></i>
			<p class="text-fg-subdued">Session not found</p>
			<a href="/app/training/calendar" class="mt-4 text-primary hover:text-primary-hover">
				Back to Calendar
			</a>
		</div>
	{:else}
		<div class="mb-8 flex items-start justify-between">
			<div>
				{#if editing}
					<input
						type="text"
						bind:value={title}
						class="mb-2 border-b-2 border-primary bg-transparent text-lg font-semibold text-fg-accent focus:outline-none"
					/>
				{:else}
					<h1 class="mb-2 text-lg font-semibold text-fg-accent">
						{session.title || 'Training Session'}
					</h1>
				{/if}
			<p class="text-fg-subdued">
				{new Date(session.startedAt).toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
					· {formatTime(session.duration)}
				</p>
			</div>
			<div class="flex gap-2">
				{#if editing}
					<button
						type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
					onclick={saveSession}
					>
						Save
					</button>
					<button
						type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-muted"
					onclick={() => (editing = false)}
				>
					Cancel
				</button>
			{:else}
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center rounded-sm border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-muted"
					onclick={() => (editing = true)}
					>
						<i class="fas fa-pen mr-2"></i>
						Edit
					</button>
					<button
						type="button"
						class="inline-flex h-[36px] items-center justify-center rounded-sm border border-error bg-surface px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
						onclick={deleteSession}
					>
						<i class="fas fa-trash mr-2"></i>
						Delete
					</button>
				{/if}
			</div>
		</div>

		{#if editing}
			<div class="mb-8">
				<label for="notes" class="mb-1 block text-sm font-medium text-fg">Notes</label>
				<textarea
					id="notes"
					bind:value={notes}
					rows="4"
					class="w-full h-[36px] rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors focus:border-primary focus:outline-none focus:ring-0"
					placeholder="Add notes about this session..."
				></textarea>
			</div>
		{:else if session.notes}
		<div class="mb-8 rounded-sm border border-border bg-surface p-4">
			<h3 class="mb-2 text-sm font-medium text-fg">Notes</h3>
			<p class="text-sm text-fg-subdued whitespace-pre-wrap">{session.notes}</p>
			</div>
		{/if}

		<div class="mb-8">
			<h2 class="mb-4 text-sm font-semibold text-fg-accent uppercase tracking-wide">Activities</h2>

			{#if activities.length === 0}
			<div class="rounded-sm border border-border bg-surface py-8 text-center">
				<p class="text-fg-subdued">No activities recorded</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each activities as activity}
						<div class="rounded-sm border border-border bg-surface p-4">
							<div class="mb-2 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="inline-flex items-center rounded-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
										{activity.type}
									</span>
									{#if activity.startedAt}
										<span class="text-sm text-fg-subdued">
											{new Date(activity.startedAt).toLocaleTimeString()}
										</span>
									{/if}
								</div>
							</div>

							{#if activity.notes}
								<p class="text-sm text-fg-subdued">{activity.notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
