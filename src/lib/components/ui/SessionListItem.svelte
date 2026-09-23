<script lang="ts">
	import { getSessionIcon } from '$lib/utils/training';
	import { formatTime } from '$lib/utils';
	import Badge from './Badge.svelte';

	let {
		session
	}: {
		session: {
			id: string;
			title?: string | null;
			startedAt: Date | string | number;
			duration?: number | null;
			status?: string;
			activityTypes?: string[];
		};
	} = $props();

	let icon = $derived(getSessionIcon(session.activityTypes ?? []));
</script>

<a
	href="/app/training/session/{session.id}"
	class="flex items-center justify-between rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50"
>
	<div class="flex items-center gap-4">
		<div class="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
			<i class="fas {icon.icon} {icon.color}"></i>
		</div>
		<div>
			<p class="font-medium text-fg">{session.title || 'Training Session'}</p>
			<p class="text-sm text-fg-subdued">
				{new Date(session.startedAt).toLocaleDateString()}
				{#if session.duration}
					· {formatTime(session.duration)}
				{/if}
			</p>
		</div>
	</div>
	<div class="flex items-center gap-4">
		{#if session.status === 'completed' || (session.duration && session.duration > 0)}
			<Badge variant="success">Completed</Badge>
		{:else if session.status === 'active'}
			<Badge variant="primary">Active</Badge>
		{:else if session.status === 'cancelled'}
			<Badge variant="danger">Cancelled</Badge>
		{/if}
		<i class="fas fa-chevron-right text-fg-subdued"></i>
	</div>
</a>
