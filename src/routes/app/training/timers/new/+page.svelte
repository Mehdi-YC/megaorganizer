<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import TimerBuilder, { type StepDraft } from '$lib/components/timers/TimerBuilder.svelte';

	let saving = $state(false);
	let error = $state('');

	async function handleSave(data: {
		name: string;
		description?: string;
		rounds: number;
		steps: StepDraft[];
	}) {
		if (saving) return;
		saving = true;
		error = '';
		const res = await fetch('/api/timers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createTemplate', ...data })
		});
		saving = false;
		if (res.ok) {
			const template = await res.json();
			goto(`/app/training/timers/${template.id}`);
		} else {
			const body = await res.json().catch(() => null);
			error = body?.error || 'Could not save the timer. Try again.';
		}
	}
</script>

<svelte:head>
	<title>New Timer - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<PageHeader title="New Timer" subtitle="Build a HIIT or WOD sequence" />
	{#if error}
		<p class="mb-3 text-xs text-error">{error}</p>
	{/if}
	<TimerBuilder {saving} saveLabel="Save Timer" onSave={handleSave} />
</div>
