<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { confirmAction } from '$lib/utils/confirm.svelte';

	interface StoredStep {
		kind: string;
		durationSec: number | null;
		groupRounds: number | null;
		children?: StoredStep[];
	}

	interface StoredTemplate {
		id: string;
		name: string;
		rounds: number;
		steps: StoredStep[];
	}

	let { data } = $props();
	let templates = $derived<StoredTemplate[]>((data.templates as StoredTemplate[]) ?? []);

	function totalSeconds(t: StoredTemplate): number {
		const sum = (steps: StoredStep[]): number =>
			steps.reduce((acc, s) => {
				const self = s.durationSec ?? 0;
				const kids = s.kind === 'group' ? sum(s.children ?? []) * (s.groupRounds ?? 1) : 0;
				return acc + self + kids;
			}, 0);
		return sum(t.steps ?? []) * (t.rounds ?? 1);
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s ? `${m}m ${s}s` : `${m}m`;
	}

	async function handleDelete(id: string) {
		if (!(await confirmAction('Delete this timer?'))) return;
		const res = await fetch('/api/timers', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteTemplate', templateId: id })
		});
		if (res.ok) await invalidateAll();
	}

	async function handleDuplicate(id: string) {
		const res = await fetch('/api/timers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'duplicateTemplate', templateId: id })
		});
		if (res.ok) await invalidateAll();
	}
</script>

<svelte:head>
	<title>Timers - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<PageHeader title="HIIT & WOD Timers" subtitle="Saved interval timers you can run again">
		<Button href="/app/training" variant="secondary" size="md">
			<i class="fas fa-arrow-left mr-2 text-xs"></i>
			Training
		</Button>
		<Button href="/app/training/timers/new" variant="primary" size="md">
			<i class="fas fa-plus mr-2 text-xs"></i>
			New Timer
		</Button>
	</PageHeader>

	{#if templates.length === 0}
		<EmptyState
			icon="fa-stopwatch"
			message="No timers yet"
			submessage="Create a HIIT or WOD timer to run it any time"
		/>
	{:else}
		<div class="space-y-2">
			{#each templates as t (t.id)}
				<div
					class="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50"
				>
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-error/10">
						<i class="fas fa-fire text-sm text-error"></i>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-fg">{t.name}</p>
						<p class="text-[10px] text-fg-subdued">
							{t.steps.length} step{t.steps.length !== 1 ? 's' : ''}
							· {t.rounds} round{t.rounds !== 1 ? 's' : ''}
							· {formatDuration(totalSeconds(t))}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<Button href="/app/training/timers/{t.id}/run" size="sm">
							<i class="fas fa-play mr-2 text-xs"></i>Start
						</Button>
						<Button
							href="/app/training/timers/{t.id}"
							variant="secondary"
							size="sm"
							aria-label="Edit"
						>
							<i class="fas fa-pen text-[10px]"></i>
						</Button>
						<button
							type="button"
							class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-border"
							onclick={() => handleDuplicate(t.id)}
							title="Duplicate"
							aria-label="Duplicate"
						>
							<i class="fas fa-copy text-[10px]"></i>
						</button>
						<button
							type="button"
							class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-muted text-fg transition-colors hover:bg-error/10 hover:text-error"
							onclick={() => handleDelete(t.id)}
							title="Delete"
							aria-label="Delete"
						>
							<i class="fas fa-trash text-[10px]"></i>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
