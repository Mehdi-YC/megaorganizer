<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	const template = untrack(() => data.template);

	interface RunStep {
		kind: 'start' | 'normal' | 'info' | 'silent' | 'end';
		label: string;
		durationSec: number | null;
		round: number;
	}

	function buildQueue(steps: Array<Record<string, unknown>>, rounds: number): RunStep[] {
		const queue: RunStep[] = [];
		const expand = (list: Array<Record<string, unknown>>, round: number) => {
			for (const step of list) {
				if (step.kind === 'group') {
					const groupRounds = Math.max(1, (step.groupRounds as number) ?? 1);
					for (let g = 0; g < groupRounds; g++)
						expand((step.children as Array<Record<string, unknown>>) ?? [], round);
				} else {
					queue.push({
						kind: step.kind as RunStep['kind'],
						label: String(step.label),
						durationSec: (step.durationSec as number | null) ?? null,
						round
					});
				}
			}
		};
		for (let r = 1; r <= Math.max(1, rounds); r++) expand(steps ?? [], r);
		return queue;
	}

	const queue = buildQueue(template.steps, template.rounds);
	const totalRounds = Math.max(1, template.rounds);

	type Status = 'idle' | 'running' | 'paused' | 'finished';
	let status = $state<Status>('idle');
	let stepIndex = $state(0);
	let remainingSec = $state(0);
	let elapsedSec = $state(0);
	let startedAt = $state(0);
	let confirmFinish = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	let tickInterval: ReturnType<typeof setInterval> | null = null;
	let confirmTimer: ReturnType<typeof setTimeout> | null = null;
	let wakeLock: WakeLockSentinel | null = null;

	const STORAGE_KEY = 'megorganize_timer_run_state';

	const current = $derived(queue[stepIndex] ?? null);
	const next = $derived(queue[stepIndex + 1] ?? null);
	const round = $derived(current?.round ?? totalRounds);

	function isTapOnly(step: RunStep | null): boolean {
		return !!step && step.kind === 'info' && !step.durationSec;
	}

	function formatClock(totalSeconds: number): string {
		const s = Math.max(0, Math.round(totalSeconds));
		const m = Math.floor(s / 60);
		return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
	}

	function playCue(step: RunStep | null) {
		if (step?.kind === 'silent') return;
		try {
			const Ctx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			const ctx = new Ctx();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = step?.kind === 'end' ? 880 : 660;
			gain.gain.value = 0.08;
			osc.start();
			osc.stop(ctx.currentTime + (step?.kind === 'end' ? 0.4 : 0.15));
			osc.onended = () => ctx.close();
		} catch {
			// audio unavailable (permissions / headless)
		}
		if ('vibrate' in navigator) {
			navigator.vibrate(step?.kind === 'end' ? [120, 60, 120] : 80);
		}
	}

	function persist() {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					templateId: template.id,
					status,
					stepIndex,
					remainingSec,
					elapsedSec,
					startedAt
				})
			);
		} catch {
			// localStorage unavailable
		}
	}

	function clearPersist() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore
		}
	}

	async function acquireWakeLock() {
		if (!('wakeLock' in navigator)) return;
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			wakeLock.addEventListener('release', () => {
				wakeLock = null;
				if (document.visibilityState === 'visible' && status === 'running') {
					acquireWakeLock();
				}
			});
		} catch {
			// Wake Lock failed — screen may turn off, run still works
		}
	}

	function releaseWakeLock() {
		if (wakeLock) {
			wakeLock.release();
			wakeLock = null;
		}
	}

	function start() {
		if (queue.length === 0) return;
		status = 'running';
		stepIndex = 0;
		elapsedSec = 0;
		startedAt = Date.now();
		remainingSec = isTapOnly(current) ? 0 : (current?.durationSec ?? 60);
		playCue(current);
		tickInterval = setInterval(tick, 1000);
		acquireWakeLock();
	}

	function tick() {
		elapsedSec += 1;
		if (isTapOnly(current)) return;
		remainingSec -= 1;
		if (remainingSec <= 0) advance();
	}

	function advance() {
		const finished = current;
		const nextIndex = stepIndex + 1;
		if (nextIndex >= queue.length) {
			finishRun();
			return;
		}
		stepIndex = nextIndex;
		remainingSec = isTapOnly(current) ? 0 : (current?.durationSec ?? 60);
		if (finished?.kind !== 'silent' && current?.kind !== 'silent') playCue(current);
	}

	function skip() {
		if (status !== 'running' && status !== 'paused') return;
		resetConfirm();
		advance();
	}

	function pause() {
		if (status !== 'running') return;
		status = 'paused';
		if (tickInterval) clearInterval(tickInterval);
		tickInterval = null;
		releaseWakeLock();
	}

	function resume() {
		if (status !== 'paused') return;
		status = 'running';
		tickInterval = setInterval(tick, 1000);
		acquireWakeLock();
	}

	function resetConfirm() {
		confirmFinish = false;
		if (confirmTimer) {
			clearTimeout(confirmTimer);
			confirmTimer = null;
		}
	}

	function requestFinish() {
		if (saving) return;
		if (!confirmFinish) {
			confirmFinish = true;
			confirmTimer = setTimeout(resetConfirm, 4000);
			return;
		}
		resetConfirm();
		finishRun();
	}

	async function finishRun() {
		if (tickInterval) clearInterval(tickInterval);
		tickInterval = null;
		releaseWakeLock();
		status = 'finished';
		playCue({ kind: 'end', label: '', durationSec: null, round: totalRounds });

		saving = true;
		saveError = '';
		const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000) || elapsedSec);
		const res = await fetch('/api/training', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'saveSession',
				title: template.name,
				notes: `${totalRounds} round${totalRounds !== 1 ? 's' : ''} · ${queue.length} steps`,
				activityType: 'hiit',
				startedAt: new Date(startedAt).toISOString(),
				duration
			})
		});
		saving = false;
		if (res.ok) {
			clearPersist();
			const saved = await res.json();
			goto(`/app/training/session/${saved.sessionId}`);
		} else {
			saveError = 'Could not save the session. The run stays on screen — try again.';
		}
	}

	function discard() {
		clearPersist();
		goto(`/app/training/timers/${template.id}`);
	}

	$effect(() => {
		if (status === 'running' || status === 'paused') persist();
	});

	const persistOnExit = () => persist();
	if (typeof window !== 'undefined') {
		window.addEventListener('pagehide', persistOnExit);
		window.addEventListener('beforeunload', persistOnExit);
	}

	// Restore an interrupted run on mount.
	$effect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw);
			if (saved.templateId !== template.id) return;
			status =
				saved.status === 'paused' ? 'paused' : saved.status === 'finished' ? 'finished' : 'idle';
			stepIndex = Math.min(saved.stepIndex ?? 0, Math.max(0, queue.length - 1));
			remainingSec = saved.remainingSec ?? 0;
			elapsedSec = saved.elapsedSec ?? 0;
			startedAt = saved.startedAt ?? Date.now();
			if (status === 'paused') {
				// Keep paused on restore; user resumes explicitly.
			}
		} catch {
			// corrupt state — start fresh
		}
	});
</script>

<svelte:head>
	<title>Run: {template.name} - MegaOrganize</title>
</svelte:head>

<div class="flex min-h-screen flex-col p-4 sm:p-8">
	<div class="mx-auto flex w-full max-w-md flex-1 flex-col">
		<div class="mb-4 flex items-center justify-between">
			<a
				href="/app/training/timers"
				class="text-xs text-fg-subdued transition-colors hover:text-fg"
			>
				<i class="fas fa-arrow-left mr-1"></i> Timers
			</a>
			<span class="text-xs text-fg-subdued">Round {round} / {totalRounds}</span>
		</div>

		<h1 class="mb-1 text-center text-lg font-semibold text-fg-accent">{template.name}</h1>

		{#if status === 'idle'}
			<div class="flex flex-1 flex-col items-center justify-center gap-4">
				<i class="fas fa-stopwatch text-5xl text-fg-subdued/30"></i>
				<p class="text-sm text-fg-subdued">
					{queue.length} steps · {totalRounds} round{totalRounds !== 1 ? 's' : ''}
				</p>
				<Button class="w-48" onclick={start}>
					<i class="fas fa-play mr-2 text-xs"></i>
					Start
				</Button>
			</div>
		{:else if status === 'finished'}
			<div class="flex flex-1 flex-col items-center justify-center gap-4">
				<i class="fas fa-trophy text-5xl text-primary"></i>
				<p class="text-sm text-fg">Finished in {formatClock(elapsedSec)}</p>
				{#if saving}
					<p class="text-xs text-fg-subdued">Saving session...</p>
				{/if}
				{#if saveError}
					<p class="text-xs text-error">{saveError}</p>
					<Button onclick={finishRun}>Retry Save</Button>
				{/if}
				<Button variant="secondary" onclick={discard}>Back to Timer</Button>
			</div>
		{:else}
			<!-- Live step -->
			<div class="flex flex-1 flex-col items-center justify-center gap-3">
				{#if current}
					<span
						class="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase"
					>
						{current.kind}
					</span>
					<p class="text-center text-xl font-semibold text-fg">{current.label}</p>
					{#if isTapOnly(current)}
						<p class="text-sm text-fg-subdued">Tap next when ready</p>
					{:else}
						<p class="text-6xl font-bold text-fg tabular-nums">{formatClock(remainingSec)}</p>
					{/if}
					{#if next}
						<p class="text-xs text-fg-subdued">Next: {next.label}</p>
					{/if}
				{/if}
			</div>

			<div class="mb-4 h-1 w-full overflow-hidden rounded-sm bg-muted">
				<div
					class="h-full bg-primary transition-all"
					style="width: {queue.length > 0 ? ((stepIndex + 1) / queue.length) * 100 : 0}%"
				></div>
			</div>

			<div class="grid grid-cols-3 gap-2">
				{#if status === 'running'}
					<Button variant="secondary" onclick={pause}>
						<i class="fas fa-pause mr-1 text-xs"></i>Pause
					</Button>
				{:else}
					<Button onclick={resume}>
						<i class="fas fa-play mr-1 text-xs"></i>Resume
					</Button>
				{/if}
				<Button variant="secondary" onclick={skip}>
					<i class="fas fa-forward mr-1 text-xs"></i>Skip
				</Button>
				<Button variant={confirmFinish ? 'danger' : 'secondary'} onclick={requestFinish}>
					{confirmFinish ? 'Confirm?' : 'Finish'}
				</Button>
			</div>
		{/if}
	</div>
</div>
