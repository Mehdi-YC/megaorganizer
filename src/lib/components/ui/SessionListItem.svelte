<script lang="ts">
	import { ACTIVITY_ICONS, getSessionIcon } from '$lib/utils/training';
	import { formatTime } from '$lib/utils';

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
	class="flex items-center justify-between rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary"
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
			<span class="inline-flex items-center rounded-sm bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
				Completed
			</span>
		{:else if session.status === 'active'}
			<span class="inline-flex items-center rounded-sm bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
				Active
			</span>
		{:else if session.status === 'cancelled'}
			<span class="inline-flex items-center rounded-sm bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
				Cancelled
			</span>
		{/if}
		<i class="fas fa-chevron-right text-fg-subdued"></i>
	</div>
</a>
