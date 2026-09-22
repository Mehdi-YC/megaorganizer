<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TimerBuilder, { type StepDraft } from '$lib/components/timers/TimerBuilder.svelte';

	let { data } = $props();
	let saving = $state(false);
	let error = $state('');

	const template = untrack(() => data.template);

	const initial = {
		name: template.name,
		description: template.description ?? undefined,
		rounds: template.rounds,
		steps: normalizeSteps(template.steps)
	};

	function normalizeSteps(steps: Array<Record<string, unknown>>): StepDraft[] {
		return (steps ?? []).map((s) => ({
			kind: s.kind as StepDraft['kind'],
			label: String(s.label),
			durationSec: (s.durationSec as number | null) ?? null,
			groupRounds: (s.groupRounds as number | null) ?? null,
			children: normalizeSteps((s.children as Array<Record<string, unknown>>) ?? [])
		}));
	}

	async function handleSave(payload: {
		name: string;
		description?: string;
		rounds: number;
		steps: StepDraft[];
	}) {
		if (saving) return;
		saving = true;
		error = '';
		const res = await fetch('/api/timers', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'updateTemplate', templateId: template.id, ...payload })
		});
		saving = false;
		if (res.ok) {
			goto('/app/training/timers');
		} else {
			const body = await res.json().catch(() => null);
			error = body?.error || 'Could not save the timer. Try again.';
		}
	}
</script>

<svelte:head>
	<title>Edit Timer - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<PageHeader title="Edit Timer" subtitle="Update the sequence">
		<Button href="/app/training/timers/{template.id}/run" variant="secondary" size="md">
			<i class="fas fa-play mr-2 text-xs"></i>
			Run
		</Button>
		<Button href="/app/training/timers" variant="secondary" size="md">
			<i class="fas fa-arrow-left mr-2 text-xs"></i>
			Timers
		</Button>
	</PageHeader>
	{#if error}
		<p class="mb-3 text-xs text-error">{error}</p>
	{/if}
	<TimerBuilder {initial} {saving} saveLabel="Save Changes" onSave={handleSave} />
</div>
