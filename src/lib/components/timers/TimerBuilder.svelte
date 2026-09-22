<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	export type StepDraft = {
		kind: 'start' | 'normal' | 'info' | 'silent' | 'end' | 'group';
		label: string;
		durationSec: number | null;
		groupRounds: number | null;
		children: StepDraft[];
	};

	let {
		initial,
		saving = false,
		saveLabel = 'Save Timer',
		onSave
	}: {
		initial?: {
			name: string;
			description?: string;
			rounds: number;
			steps: StepDraft[];
		};
		saving?: boolean;
		saveLabel?: string;
		onSave: (data: {
			name: string;
			description?: string;
			rounds: number;
			steps: StepDraft[];
		}) => void;
	} = $props();

	const draft = untrack(() => initial);

	let name = $state(draft?.name ?? '');
	let rounds = $state(draft?.rounds ?? 1);
	let steps = $state<StepDraft[]>(draft?.steps ?? []);
	let expandGroups = $state<Record<number, boolean>>({});

	function makeStep(kind: StepDraft['kind']): StepDraft {
		const labels: Record<StepDraft['kind'], string> = {
			start: 'Get ready',
			normal: 'Step',
			info: 'Info',
			silent: 'Step',
			end: 'Done',
			group: 'Group'
		};
		return {
			kind,
			label: labels[kind],
			durationSec: kind === 'group' || kind === 'info' ? null : 60,
			groupRounds: kind === 'group' ? 2 : null,
			children: []
		};
	}

	function addStep(kind: StepDraft['kind']) {
		steps = [...steps, makeStep(kind)];
	}

	function addGroupChild(index: number) {
		steps = steps.map((s, i) =>
			i === index ? { ...s, children: [...s.children, makeStep('normal')] } : s
		);
		expandGroups = { ...expandGroups, [index]: true };
	}

	function removeAt(list: StepDraft[], index: number): StepDraft[] {
		return list.filter((_, i) => i !== index);
	}

	function removeStep(index: number) {
		steps = removeAt(steps, index);
	}

	function removeGroupChild(index: number, childIndex: number) {
		steps = steps.map((s, i) =>
			i === index ? { ...s, children: removeAt(s.children, childIndex) } : s
		);
	}

	function moveStep(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= steps.length) return;
		const next = [...steps];
		[next[index], next[target]] = [next[target], next[index]];
		steps = next;
	}

	function moveGroupChild(index: number, childIndex: number, delta: number) {
		const group = steps[index];
		const target = childIndex + delta;
		if (target < 0 || target >= group.children.length) return;
		const children = [...group.children];
		[children[childIndex], children[target]] = [children[target], children[childIndex]];
		steps = steps.map((s, i) => (i === index ? { ...s, children } : s));
	}

	function toggleGroupOpen(index: number) {
		expandGroups = { ...expandGroups, [index]: !expandGroups[index] };
	}

	function toggleSilent(index: number) {
		steps = steps.map((s, i) =>
			i === index ? { ...s, kind: s.kind === 'silent' ? 'normal' : 'silent' } : s
		) as StepDraft[];
	}

	function toggleGroupChildSilent(index: number, childIndex: number) {
		steps = steps.map((s, i) => {
			if (i !== index) return s;
			const children = s.children.map((c, ci) =>
				ci === childIndex ? { ...c, kind: c.kind === 'silent' ? 'normal' : 'silent' } : c
			) as StepDraft[];
			return { ...s, children };
		}) as StepDraft[];
	}

	// MM:SS ⇄ seconds helpers kept local to the row editors.
	function mm(sec: number | null): number {
		return Math.floor((sec ?? 0) / 60);
	}
	function ss(sec: number | null): number {
		return (sec ?? 0) % 60;
	}
	function setMs(target: StepDraft, m: number, s: number) {
		target.durationSec = Math.max(0, m * 60 + s);
	}

	function kindBadge(kind: StepDraft['kind']): string {
		switch (kind) {
			case 'start':
				return 'bg-success/10 text-success';
			case 'end':
				return 'bg-primary/10 text-primary';
			case 'info':
				return 'bg-muted text-fg-subdued';
			case 'silent':
				return 'bg-warning/10 text-warning';
			case 'group':
				return 'bg-blue-500/10 text-blue-500';
			default:
				return 'bg-error/10 text-error';
		}
	}

	function handleSave() {
		if (!name.trim() || steps.length === 0 || saving) return;
		onSave({
			name: name.trim(),
			rounds: Math.max(1, rounds),
			steps: steps.map((s) => ({
				...s,
				durationSec: s.kind === 'info' ? s.durationSec : (s.durationSec ?? 60)
			}))
		});
	}
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<div class="rounded-sm border border-border bg-surface p-4">
		<div class="grid grid-cols-2 gap-3">
			<Input name="timer-name" label="NAME" bind:value={name} placeholder="Timer name" />
			<Input
				type="number"
				name="timer-rounds"
				label="REPETITIONS"
				bind:value={rounds}
				min={1}
				step={1}
			/>
		</div>
	</div>

	<div class="rounded-sm border border-border bg-surface p-4">
		<h3 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
			Steps ({steps.length})
		</h3>

		{#if steps.length === 0}
			<p class="mb-3 text-xs text-fg-subdued">Add steps below to build the sequence.</p>
		{:else}
			<div class="space-y-2">
				{#each steps as step, i (`${i}-${step.kind}`)}
					<div class="rounded-sm border border-border bg-bg p-2">
						<div class="flex flex-wrap items-center gap-2">
							<button
								type="button"
								class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
								onclick={() => moveStep(i, -1)}
								aria-label="Move up"
							>
								<i class="fas fa-arrow-up"></i>
							</button>
							<button
								type="button"
								class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
								onclick={() => moveStep(i, 1)}
								aria-label="Move down"
							>
								<i class="fas fa-arrow-down"></i>
							</button>
							<span
								class="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold {kindBadge(step.kind)}"
							>
								{step.kind}
							</span>
							<input
								type="text"
								bind:value={step.label}
								class="h-8 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 text-sm text-fg focus:border-primary focus:outline-none"
								aria-label="Step label"
							/>
							{#if step.kind === 'group'}
								<span class="text-[10px] text-fg-subdued">x</span>
								<input
									type="number"
									bind:value={step.groupRounds}
									min={1}
									step={1}
									class="h-8 w-12 rounded-sm border border-border bg-surface px-1 text-center text-sm text-fg focus:border-primary focus:outline-none"
									aria-label="Group rounds"
								/>
							{:else if step.kind !== 'info'}
								<input
									type="number"
									value={mm(step.durationSec)}
									min={0}
									step={1}
									class="h-8 w-12 rounded-sm border border-border bg-surface px-1 text-center text-sm text-fg focus:border-primary focus:outline-none"
									aria-label="Minutes"
									oninput={(e) => setMs(step, Number(e.currentTarget.value), ss(step.durationSec))}
								/>
								<span class="text-xs text-fg-subdued">:</span>
								<input
									type="number"
									value={ss(step.durationSec)}
									min={0}
									max={59}
									step={1}
									class="h-8 w-12 rounded-sm border border-border bg-surface px-1 text-center text-sm text-fg focus:border-primary focus:outline-none"
									aria-label="Seconds"
									oninput={(e) => setMs(step, mm(step.durationSec), Number(e.currentTarget.value))}
								/>
								{#if step.kind !== 'start' && step.kind !== 'end'}
									<button
										type="button"
										class="cursor-pointer rounded-sm px-1.5 py-0.5 text-[9px] font-semibold transition-colors {step.kind ===
										'silent'
											? 'bg-warning/20 text-warning'
											: 'bg-muted text-fg-subdued hover:bg-border'}"
										onclick={() => toggleSilent(i)}
										title="Silent step: no cue on transition"
									>
										<i class="fas fa-volume-xmark mr-1"></i>silent
									</button>
								{/if}
							{:else}
								<span class="text-[10px] text-fg-subdued">tap to continue</span>
							{/if}
							<button
								type="button"
								class="cursor-pointer text-[10px] text-error"
								onclick={() => removeStep(i)}
								aria-label="Remove step"
							>
								<i class="fas fa-trash"></i>
							</button>
						</div>

						{#if step.kind === 'group'}
							<div class="mt-2 border-t border-border/50 pt-2">
								<button
									type="button"
									class="mb-1 cursor-pointer text-[10px] text-primary hover:text-primary-hover"
									onclick={() => toggleGroupOpen(i)}
								>
									<i class="fas fa-chevron-{expandGroups[i] ? 'down' : 'right'} mr-1"></i>
									{step.children.length} step{step.children.length !== 1 ? 's' : ''} in group
								</button>
								{#if expandGroups[i]}
									<div class="ml-4 space-y-1.5">
										{#each step.children as child, ci (`${ci}-${child.kind}`)}
											<div class="flex flex-wrap items-center gap-2">
												<button
													type="button"
													class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
													onclick={() => moveGroupChild(i, ci, -1)}
													aria-label="Move up"
												>
													<i class="fas fa-arrow-up"></i>
												</button>
												<button
													type="button"
													class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
													onclick={() => moveGroupChild(i, ci, 1)}
													aria-label="Move down"
												>
													<i class="fas fa-arrow-down"></i>
												</button>
												<span
													class="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold {kindBadge(
														child.kind
													)}"
												>
													{child.kind}
												</span>
												<input
													type="text"
													bind:value={child.label}
													class="h-7 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
													aria-label="Child step label"
												/>
												<input
													type="number"
													value={mm(child.durationSec)}
													min={0}
													step={1}
													class="h-7 w-10 rounded-sm border border-border bg-surface px-1 text-center text-xs text-fg focus:border-primary focus:outline-none"
													aria-label="Minutes"
													oninput={(e) =>
														setMs(child, Number(e.currentTarget.value), ss(child.durationSec))}
												/>
												<span class="text-[10px] text-fg-subdued">:</span>
												<input
													type="number"
													value={ss(child.durationSec)}
													min={0}
													max={59}
													step={1}
													class="h-7 w-10 rounded-sm border border-border bg-surface px-1 text-center text-xs text-fg focus:border-primary focus:outline-none"
													aria-label="Seconds"
													oninput={(e) =>
														setMs(child, mm(child.durationSec), Number(e.currentTarget.value))}
												/>
												<button
													type="button"
													class="cursor-pointer rounded-sm px-1.5 py-0.5 text-[9px] font-semibold transition-colors {child.kind ===
													'silent'
														? 'bg-warning/20 text-warning'
														: 'bg-muted text-fg-subdued hover:bg-border'}"
													onclick={() => toggleGroupChildSilent(i, ci)}
													title="Silent step: no cue on transition"
												>
													<i class="fas fa-volume-xmark"></i>
												</button>
												<button
													type="button"
													class="cursor-pointer text-[10px] text-error"
													onclick={() => removeGroupChild(i, ci)}
													aria-label="Remove step"
												>
													<i class="fas fa-trash"></i>
												</button>
											</div>
										{/each}
										<button
											type="button"
											class="cursor-pointer text-[10px] text-primary hover:text-primary-hover"
											onclick={() => addGroupChild(i)}
										>
											<i class="fas fa-plus mr-1"></i>Add step to group
										</button>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
			<Button variant="secondary" size="sm" onclick={() => addStep('normal')}>
				<i class="fas fa-plus mr-1 text-[10px]"></i>Step
			</Button>
			<Button variant="secondary" size="sm" onclick={() => addStep('info')}>
				<i class="fas fa-info mr-1 text-[10px]"></i>Info
			</Button>
			<Button variant="secondary" size="sm" onclick={() => addStep('group')}>
				<i class="fas fa-layer-group mr-1 text-[10px]"></i>Group
			</Button>
			<Button variant="secondary" size="sm" onclick={() => addStep('start')}>
				<i class="fas fa-flag-checkered mr-1 text-[10px]"></i>Start
			</Button>
			<Button variant="secondary" size="sm" onclick={() => addStep('end')}>
				<i class="fas fa-trophy mr-1 text-[10px]"></i>End
			</Button>
		</div>
	</div>

	<Button
		class="w-full"
		onclick={handleSave}
		disabled={!name.trim() || steps.length === 0 || saving}
	>
		{saving ? 'Saving...' : saveLabel}
	</Button>
</div>
