<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { formatTime, formatPace } from '$lib/utils';
	import {
		computeRunStats,
		buildRunPayload,
		saveRunApi,
		MS_TO_KMH,
		TIMER_INTERVAL_MS,
		GPS_WATCH_OPTIONS,
		handleGpsPosition,
		type GpsTrackingState,
		type GpsPoint
	} from '$lib/utils/gps';
	import {
		saveSessionState,
		loadSessionState,
		clearSessionState,
		type ExerciseRecordDraft
	} from '$lib/utils/session-persist';
	import RunMap from '$lib/components/ui/RunMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let { data } = $props();
	let title = $state('');
	let notes = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	const activityTypes = ['strength', 'running', 'cycling', 'walking', 'swimming', 'other'] as const;
	let activityType = $state<(typeof activityTypes)[number]>('strength');
	let selectedItems = $state<string[]>([]);
	let exerciseRecords = $state<ExerciseRecordDraft[]>([]);

	let elapsedTime = $state(0);
	let timerRunning = $state(false);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let startTime = $state(0);
	let finished = $state(false);

	const gpsTypes = ['running', 'cycling', 'walking'];
	let isGpsActivity = $derived(gpsTypes.includes(activityType));

	let gpsStatus = $state<'idle' | 'requesting' | 'tracking' | 'paused'>('idle');
	let currentPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let gpsPoints = $state<GpsPoint[]>([]);
	let distance = $state(0);
	let currentSpeed = $state(0);
	let averageSpeed = $state(0);
	let averagePace = $state(0);
	let currentPace = $state(0);
	let maxSpeed = $state(0);
	let bestPace = $state(0);
	let watchId: number | null = null;
	let lastPoint: GpsPoint | null = null;
	let wakeLock: WakeLockSentinel | null = null;
	let visibilityHandler: (() => void) | null = null;
	let gpsError: string | null = $state(null);

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		stopGpsWatch();
		releaseWakeLock();
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
	});

	onMount(() => {
		const saved = loadSessionState();
		if (!saved) return;

		// Form drafts restore even if tracking never started, so a reload
		// never discards what was typed or selected.
		if (saved.title) title = saved.title;
		if (saved.notes) notes = saved.notes;
		if (saved.activityType && (activityTypes as readonly string[]).includes(saved.activityType)) {
			activityType = saved.activityType as typeof activityType;
		}
		if (saved.selectedItems) selectedItems = saved.selectedItems;
		if (saved.exerciseRecords) exerciseRecords = saved.exerciseRecords;

		if (saved.status === 'running' || saved.status === 'paused') {
			const wasRunning = saved.status === 'running';
			gpsStatus = wasRunning ? 'tracking' : 'paused';
			elapsedTime = saved.elapsed;
			startTime = saved.startTime;
			distance = saved.distance;
			currentSpeed = saved.currentSpeed;
			averageSpeed = saved.averageSpeed;
			maxSpeed = saved.maxSpeed;
			currentPace = saved.currentPace;
			averagePace = saved.averagePace;
			bestPace = saved.bestPace;
			currentPosition = saved.currentPosition;
			gpsPoints = saved.gpsPoints;
			lastPoint = saved.gpsPoints.length > 0 ? saved.gpsPoints[saved.gpsPoints.length - 1] : null;
			timerRunning = wasRunning;
			if (wasRunning) {
				timerInterval = setInterval(() => {
					elapsedTime = Math.floor((Date.now() - startTime) / 1000);
					updateStats();
					persistState();
				}, TIMER_INTERVAL_MS);
				startGpsWatch();
				acquireWakeLock();
				setupVisibilityHandler();
			}
		}
	});

	// Persist form drafts as they change so a reload mid-edit keeps them.
	$effect(() => {
		title;
		notes;
		activityType;
		selectedItems;
		exerciseRecords;
		persistState();
	});

	function persistState() {
		saveSessionState({
			status: timerRunning ? 'running' : startTime > 0 ? 'paused' : 'draft',
			startTime,
			elapsed: elapsedTime,
			distance,
			currentSpeed,
			averageSpeed,
			maxSpeed,
			currentPace,
			averagePace,
			bestPace,
			currentPosition,
			gpsPoints,
			title,
			notes,
			activityType,
			selectedItems,
			exerciseRecords
		});
	}

	async function acquireWakeLock() {
		if (!('wakeLock' in navigator)) return;
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			wakeLock.addEventListener('release', () => {
				wakeLock = null;
			});
		} catch (err) {
			console.warn('Wake Lock failed:', err);
		}
	}

	function releaseWakeLock() {
		if (wakeLock) {
			wakeLock.release();
			wakeLock = null;
		}
	}

	function gpsCallback(position: GeolocationPosition) {
		const result = handleGpsPosition(position, {
			lastPoint,
			distance,
			currentSpeed,
			maxSpeed,
			gpsPoints
		});
		distance = result.updatedState.distance;
		currentSpeed = result.updatedState.currentSpeed;
		maxSpeed = result.updatedState.maxSpeed;
		// Reassign to trigger Svelte reactivity (same array, new signal)
		gpsPoints = result.updatedState.gpsPoints;
		lastPoint = result.updatedState.lastPoint;
		currentPosition = { latitude: result.newPoint.latitude, longitude: result.newPoint.longitude };
		gpsError = null;
		updateStats();
		persistState();
	}

	function gpsErrorCallback(error: GeolocationPositionError) {
		console.error('GPS error:', error);
		if (error.code === error.PERMISSION_DENIED) {
			gpsError = 'Location permission denied. Please enable it in your browser settings.';
		} else if (error.code === error.TIMEOUT) {
			gpsError = 'GPS signal lost. Trying to reconnect...';
		} else {
			gpsError = 'GPS unavailable. Make sure location services are enabled.';
		}
	}

	function startGpsWatch() {
		stopGpsWatch();
		watchId = navigator.geolocation.watchPosition(gpsCallback, gpsErrorCallback, GPS_WATCH_OPTIONS);
		gpsError = null;
	}

	function stopGpsWatch() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
	}

	function setupVisibilityHandler() {
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = async () => {
			if (document.visibilityState === 'visible' && timerRunning) {
				await acquireWakeLock();
				elapsedTime = Math.floor((Date.now() - startTime) / 1000);
				// Restart GPS watch — mobile browsers may have killed it while screen was off
				startGpsWatch();
				updateStats();
				persistState();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	}

	function startTimer() {
		if (timerRunning) return;
		startTime = Date.now() - elapsedTime * 1000;
		timerRunning = true;
		timerInterval = setInterval(() => {
			elapsedTime = Math.floor((Date.now() - startTime) / 1000);
			updateStats();
			persistState();
		}, TIMER_INTERVAL_MS);
		acquireWakeLock();
	}

	function pauseTimer() {
		timerRunning = false;
		if (timerInterval) clearInterval(timerInterval);
		releaseWakeLock();
	}

	function startGpsTracking() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported by your browser');
			return;
		}
		gpsStatus = 'requesting';
		navigator.geolocation.getCurrentPosition(
			() => {
				gpsStatus = 'tracking';
				startTimer();
				startGpsWatch();
				acquireWakeLock();
				setupVisibilityHandler();
			},
			() => {
				gpsStatus = 'idle';
				alert('Location permission denied. Please enable location services.');
			},
			{ enableHighAccuracy: true }
		);
	}

	function resumeGpsTracking() {
		gpsStatus = 'tracking';
		startTimer();
		startGpsWatch();
		acquireWakeLock();
		setupVisibilityHandler();
	}

	function updateStats() {
		const stats = computeRunStats({ distance, elapsed: elapsedTime, currentSpeed });
		averageSpeed = stats.averageSpeed;
		averagePace = stats.averagePace;
		currentPace = stats.currentPace;
		if (currentPace > 0 && (bestPace === 0 || currentPace < bestPace)) {
			bestPace = currentPace;
		}
	}

	function toggleItem(itemId: string) {
		if (selectedItems.includes(itemId)) {
			selectedItems = selectedItems.filter((id) => id !== itemId);
			exerciseRecords = exerciseRecords.filter((r) => r.itemId !== itemId);
		} else {
			selectedItems = [...selectedItems, itemId];
			exerciseRecords = [
				...exerciseRecords,
				{ itemId, sets: 3, reps: '10', weight: 0, unit: 'kg', rpe: 7, restTime: 90, notes: '' }
			];
		}
	}

	function updateRecord(itemId: string, field: keyof ExerciseRecordDraft, value: string | number) {
		exerciseRecords = exerciseRecords.map((r) =>
			r.itemId === itemId ? { ...r, [field]: value } : r
		);
	}

	function parseRecordInt(value: string, fallback: number): number {
		const n = parseInt(value, 10);
		return Number.isNaN(n) ? fallback : n;
	}

	function parseRecordFloat(value: string, fallback: number): number {
		const n = parseFloat(value);
		return Number.isNaN(n) ? fallback : n;
	}

	async function saveSession() {
		if (saving) return;
		saving = true;
		saveError = null;
		pauseTimer();
		stopGpsWatch();
		releaseWakeLock();
		if (visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
			visibilityHandler = null;
		}

		try {
			if (isGpsActivity && gpsPoints.length > 0) {
				const runData = buildRunPayload({
					gpsPoints,
					distance,
					elapsedDuration: elapsedTime,
					averageSpeed: averageSpeed / MS_TO_KMH,
					maxSpeed: maxSpeed / MS_TO_KMH,
					averagePace,
					bestPace,
					title: title || undefined,
					notes: notes || undefined
				});

				const result = await saveRunApi(runData);
				if (!result.sessionId) throw new Error('Failed to save session. Please try again.');
				clearSessionState();
				goto(`/app/training/session/${result.sessionId}`);
				return;
			}

			// Single transactional request: either the whole session is saved
			// or nothing is, so retrying can never duplicate data.
			const res = await fetch('/api/training', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'saveSession',
					title: title || undefined,
					notes: notes || undefined,
					activityType,
					startedAt: new Date(startTime || Date.now()).toISOString(),
					duration: elapsedTime,
					exerciseRecords:
						exerciseRecords.length > 0
							? exerciseRecords.map((record, i) => ({
									itemId: record.itemId,
									sets: record.sets,
									reps: record.reps,
									weight: record.weight,
									unit: record.unit,
									rpe: record.rpe,
									restTime: record.restTime,
									notes: record.notes || undefined,
									position: i
								}))
							: undefined
				})
			});
			const saved = await res.json().catch(() => null);
			if (!res.ok || !saved?.sessionId) {
				throw new Error(saved?.error || 'Failed to save session. Please try again.');
			}
			clearSessionState();
			goto(`/app/training/session/${saved.sessionId}`);
		} catch (e) {
			console.error('Failed to save session:', e);
			saveError = e instanceof Error ? e.message : 'Failed to save session. Please try again.';
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Session - Training - MegaOrganize</title>
</svelte:head>

<div class="max-w-2xl p-4 sm:p-8">
	<div class="mb-6">
		<a href="/app/training" class="text-sm text-fg-subdued transition-colors hover:text-fg">
			<i class="fas fa-arrow-left mr-1"></i> Back to Training
		</a>
	</div>

	<h1 class="mb-6 text-lg font-semibold text-fg-accent">New Training Session</h1>

	{#if !finished}
		{#if isGpsActivity}
			<div class="mb-6 rounded-sm border border-border bg-surface p-6">
				{#if gpsStatus === 'idle'}
					<div class="py-8 text-center">
						<i class="fas fa-location-crosshairs mb-4 text-4xl text-primary"></i>
						<p class="mb-4 text-fg-subdued">GPS tracking for {activityType}</p>
						<Button variant="primary" onclick={startGpsTracking}>
							<i class="fas fa-play mr-2"></i> Start {activityType}
						</Button>
					</div>
				{:else if gpsStatus === 'requesting'}
					<div class="py-8 text-center">
						<div class="mx-auto mb-4 flex justify-center">
							<Spinner size="lg" />
						</div>
						<p class="text-fg-subdued">Waiting for GPS...</p>
					</div>
				{:else}
					<div class="relative mb-4 overflow-hidden rounded-sm" style="height: 300px;">
						<RunMap
							points={gpsPoints}
							center={currentPosition}
							followPosition={true}
							showRoute={true}
							className="rounded-sm"
						/>
					</div>

					{#if gpsError}
						<div
							class="mb-3 flex items-center gap-2 rounded-sm border border-yellow-500/30 bg-yellow-500/15 px-4 py-2 text-xs text-yellow-400"
						>
							<i class="fas fa-satellite-dish"></i>
							<span>{gpsError}</span>
						</div>
					{/if}

					<div class="mb-4 text-center">
						<div class="text-4xl font-bold tabular-nums">{formatTime(elapsedTime)}</div>
					</div>

					<div class="mb-4 grid grid-cols-2 gap-4 text-center">
						<div>
							<div class="text-2xl font-bold tabular-nums">{(distance / 1000).toFixed(2)}</div>
							<div class="text-xs text-fg-subdued">km</div>
						</div>
						<div>
							<div class="text-2xl font-bold tabular-nums">{formatPace(currentPace)}</div>
							<div class="text-xs text-fg-subdued">/km</div>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-3 text-center text-xs">
						<div>
							<div class="font-semibold tabular-nums">{formatPace(averagePace)}</div>
							<div class="text-fg-subdued">Avg Pace</div>
						</div>
						<div>
							<div class="font-semibold tabular-nums">{currentSpeed.toFixed(1)}</div>
							<div class="text-fg-subdued">km/h</div>
						</div>
						<div>
							<div class="font-semibold tabular-nums">{averageSpeed.toFixed(1)}</div>
							<div class="text-fg-subdued">Avg km/h</div>
						</div>
					</div>

					{#if gpsStatus === 'paused'}
						<div class="text-center">
							<Button variant="primary" onclick={resumeGpsTracking}>
								<i class="fas fa-play mr-2"></i> Resume {activityType}
							</Button>
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="mb-6 rounded-sm border border-border bg-surface p-6">
				<div class="mb-6 text-center">
					<div class="mb-2 text-5xl font-bold text-fg tabular-nums">{formatTime(elapsedTime)}</div>
					{#if timerRunning}
						<Button variant="secondary" onclick={pauseTimer}>
							<i class="fas fa-pause mr-2"></i> Pause
						</Button>
					{:else}
						<Button variant="primary" onclick={startTimer}>
							<i class="fas fa-play mr-2"></i>
							{elapsedTime > 0 ? 'Resume' : 'Start'}
						</Button>
					{/if}
				</div>
			</div>
		{/if}

		<div class="space-y-6">
			<Input
				label="Title"
				bind:value={title}
				placeholder="e.g. Upper Body, Leg Day, Morning Run..."
			/>

			<Select label="Activity Type" id="type" bind:value={activityType}>
				<option value="strength">Strength</option>
				<option value="running">Running</option>
				<option value="cycling">Cycling</option>
				<option value="walking">Walking</option>
				<option value="swimming">Swimming</option>
				<option value="other">Other</option>
			</Select>

			{#if activityType === 'strength'}
				<div>
					<h3 class="mb-2 text-sm font-medium text-fg">Exercises</h3>
					<p class="mb-3 text-xs text-fg-subdued">Select items to add as exercises</p>
					<div class="max-h-48 space-y-1 overflow-y-auto rounded-sm border border-border bg-bg p-2">
						{#each data.items as item}
							<div class="rounded-sm px-2 py-1.5 transition-colors hover:bg-muted">
								<Checkbox
									checked={selectedItems.includes(item.id)}
									onchange={() => toggleItem(item.id)}
									label={item.name}
								/>
							</div>
						{/each}
						{#if data.items.length === 0}
							<p class="py-4 text-center text-xs text-fg-subdued">
								No items in library. Create items first.
							</p>
						{/if}
					</div>
				</div>

				{#if exerciseRecords.length > 0}
					<div class="space-y-3">
						<h3 class="text-sm font-medium text-fg">Exercise Records</h3>
						{#each exerciseRecords as record}
							{@const item = data.items.find((i: any) => i.id === record.itemId)}
							<div class="rounded-sm border border-border bg-bg p-3">
								<p class="mb-2 text-sm font-medium text-fg">{item?.name || 'Exercise'}</p>
								<div class="grid grid-cols-3 gap-2">
									<div>
										<label for="sets-{record.itemId}" class="text-[10px] text-fg-subdued"
											>Sets</label
										>
										<input
											id="sets-{record.itemId}"
											type="number"
											value={record.sets}
											onchange={(e) =>
												updateRecord(
													record.itemId,
													'sets',
													parseRecordInt(e.currentTarget.value, 3)
												)}
											class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label for="reps-{record.itemId}" class="text-[10px] text-fg-subdued"
											>Reps</label
										>
										<input
											id="reps-{record.itemId}"
											type="text"
											value={record.reps}
											onchange={(e) => updateRecord(record.itemId, 'reps', e.currentTarget.value)}
											class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label for="weight-{record.itemId}" class="text-[10px] text-fg-subdued"
											>Weight</label
										>
										<div class="flex">
											<input
												id="weight-{record.itemId}"
												type="number"
												value={record.weight}
												onchange={(e) =>
													updateRecord(
														record.itemId,
														'weight',
														parseRecordFloat(e.currentTarget.value, 0)
													)}
												class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
											/>
											<span class="ml-1 self-center text-[10px] text-fg-subdued">kg</span>
										</div>
									</div>
									<div>
										<label for="rpe-{record.itemId}" class="text-[10px] text-fg-subdued">RPE</label>
										<input
											id="rpe-{record.itemId}"
											type="number"
											min="1"
											max="10"
											value={record.rpe}
											onchange={(e) =>
												updateRecord(
													record.itemId,
													'rpe',
													parseRecordInt(e.currentTarget.value, 7)
												)}
											class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label for="rest-{record.itemId}" class="text-[10px] text-fg-subdued"
											>Rest (s)</label
										>
										<input
											id="rest-{record.itemId}"
											type="number"
											value={record.restTime}
											onchange={(e) =>
												updateRecord(
													record.itemId,
													'restTime',
													parseRecordInt(e.currentTarget.value, 90)
												)}
											class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label for="notes-{record.itemId}" class="text-[10px] text-fg-subdued"
											>Notes</label
										>
										<input
											id="notes-{record.itemId}"
											type="text"
											value={record.notes}
											onchange={(e) => updateRecord(record.itemId, 'notes', e.currentTarget.value)}
											placeholder="optional"
											class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<Textarea label="Notes" bind:value={notes} rows={3} placeholder="Optional notes..." />
		</div>
	{:else}
		<div class="py-12 text-center">
			<i class="fas fa-check-circle mb-4 text-5xl text-green-400"></i>
			<h2 class="mb-2 text-lg font-semibold text-fg-accent">Session Saved!</h2>
		</div>
	{/if}

	<div class="mt-6">
		{#if saveError}
			<div
				class="mb-3 flex items-center gap-2 rounded-sm border border-error/30 bg-error/15 px-4 py-2 text-xs text-error"
			>
				<i class="fas fa-circle-exclamation"></i>
				<span>{saveError}</span>
			</div>
		{/if}
		<div class="flex gap-3">
			{#if isGpsActivity && gpsStatus === 'tracking'}
				<Button variant="danger" loading={saving} onclick={saveSession}>
					<i class="fas fa-stop mr-2"></i> Finish
				</Button>
			{:else}
				<Button variant="primary" loading={saving} onclick={saveSession}>
					{saveError ? 'Retry Save' : 'Save Session'}
				</Button>
			{/if}
			<Button href="/app/training" variant="secondary" onclick={() => clearSessionState()}>
				Cancel
			</Button>
		</div>
	</div>
</div>
