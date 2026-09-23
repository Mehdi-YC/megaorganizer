<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { formatTime, formatPace } from '$lib/utils';
	import {
		computeRunStats,
		buildRunPayload,
		saveRunApi,
		MS_TO_KMH,
		TIMER_INTERVAL_MS,
		GPS_WATCH_OPTIONS,
		handleGpsPosition,
		type GpsPoint
	} from '$lib/utils/gps';
	import {
		saveRunningState,
		loadRunningState,
		clearRunningState
	} from '$lib/utils/session-persist';
	import RunMap from '$lib/components/ui/RunMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let status = $state<'idle' | 'requesting' | 'running' | 'paused' | 'finished'>('idle');
	let runTitle = $state('');
	let saveError = $state<string | null>(null);
	let finishing = $state(false);
	let confirmFinish = $state(false);
	let confirmDiscard = $state(false);
	let confirmTimer: ReturnType<typeof setTimeout> | null = null;
	let startTime = $state(0);
	let elapsed = $state(0);
	let distance = $state(0);
	let currentSpeed = $state(0);
	let averageSpeed = $state(0);
	let maxSpeed = $state(0);
	let currentPace = $state(0);
	let averagePace = $state(0);
	let bestPace = $state(0);
	let currentPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let gpsPoints = $state<GpsPoint[]>([]);
	let watchId: number | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let lastPoint: GpsPoint | null = null;
	let gpsHeartbeat: ReturnType<typeof setInterval> | null = null;
	let lastFixAt = 0;
	const GPS_HEARTBEAT_MS = 30_000;
	const GPS_STALE_MS = 90_000;
	let wakeLock: WakeLockSentinel | null = null;
	let visibilityHandler: (() => void) | null = null;
	let gpsError: string | null = $state(null);

	onMount(() => {
		const saved = loadRunningState();
		if (
			saved &&
			(saved.status === 'running' || saved.status === 'paused' || saved.status === 'finished')
		) {
			status = saved.status as typeof status;
			runTitle = saved.title ?? '';
			startTime = saved.startTime;
			elapsed = saved.elapsed;
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
			if (status === 'running') {
				timerInterval = setInterval(updateTimer, TIMER_INTERVAL_MS);
				startGpsWatch();
				acquireWakeLock();
				setupVisibilityHandler();
			}
			// 'finished' restores the summary screen so an unsaved run can
			// still be retried after a reload.
			if (status === 'finished') {
				saveError = 'This run has not been saved yet.';
			}
		}

		const persistOnExit = () => persistState();
		window.addEventListener('pagehide', persistOnExit);
		window.addEventListener('beforeunload', persistOnExit);

		return () => {
			window.removeEventListener('pagehide', persistOnExit);
			window.removeEventListener('beforeunload', persistOnExit);
			stopGpsWatch();
			if (timerInterval) clearInterval(timerInterval);
			if (confirmTimer) clearTimeout(confirmTimer);
			releaseWakeLock();
			if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		};
	});

	$effect(() => {
		if (status === 'running' || status === 'paused' || status === 'finished') {
			persistState();
		}
	});

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
		lastFixAt = Date.now();
		const result = handleGpsPosition(position, {
			lastPoint,
			distance,
			currentSpeed,
			maxSpeed,
			gpsPoints
		});
		if (!result.accepted) return;
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
		// Heartbeat: mobile browsers freeze watchPosition while the screen is
		// off, which draws one straight line across the gap. A periodic
		// getCurrentPosition fills those gaps (background timers throttle to
		// roughly one per minute, still far better than nothing) and re-arms
		// the watch if it went completely silent.
		gpsHeartbeat = setInterval(() => {
			navigator.geolocation.getCurrentPosition(gpsCallback, () => {}, GPS_WATCH_OPTIONS);
			if (Date.now() - lastFixAt > GPS_STALE_MS) {
				startGpsWatch();
			}
		}, GPS_HEARTBEAT_MS);
		gpsError = null;
	}

	function stopGpsWatch() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		if (gpsHeartbeat !== null) {
			clearInterval(gpsHeartbeat);
			gpsHeartbeat = null;
		}
	}

	function setupVisibilityHandler() {
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = async () => {
			if (document.visibilityState === 'visible' && status === 'running') {
				await acquireWakeLock();
				elapsed = Math.floor((Date.now() - startTime) / 1000);
				// Restart GPS watch — mobile browsers may have killed it while screen was off
				startGpsWatch();
				updateStats();
				persistState();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	}

	function requestGpsPermission() {
		if (!navigator.geolocation) {
			gpsError = 'Geolocation is not supported by your browser';
			return;
		}
		status = 'requesting';
		navigator.geolocation.getCurrentPosition(
			() => {
				status = 'running';
				startTracking();
			},
			() => {
				status = 'idle';
				gpsError = 'Location permission denied. Please enable location services.';
			},
			{ enableHighAccuracy: true }
		);
	}

	function startTracking() {
		startTime = Date.now();
		timerInterval = setInterval(updateTimer, TIMER_INTERVAL_MS);
		acquireWakeLock();
		setupVisibilityHandler();
		startGpsWatch();
	}

	function updateTimer() {
		if (status === 'running') {
			elapsed = Math.floor((Date.now() - startTime) / 1000);
			updateStats();
			persistState();
		}
	}

	function persistState() {
		saveRunningState({
			status,
			startTime,
			elapsed,
			distance,
			currentSpeed,
			averageSpeed,
			maxSpeed,
			currentPace,
			averagePace,
			bestPace,
			currentPosition,
			gpsPoints,
			title: runTitle || undefined
		});
	}

	function updateStats() {
		const stats = computeRunStats({ distance, elapsed, currentSpeed });
		averageSpeed = stats.averageSpeed;
		averagePace = stats.averagePace;
		currentPace = stats.currentPace;
		if (currentPace > 0 && (bestPace === 0 || currentPace < bestPace)) {
			bestPace = currentPace;
		}
	}

	function pauseRun() {
		status = 'paused';
		if (timerInterval) clearInterval(timerInterval);
		stopGpsWatch();
		releaseWakeLock();
	}

	function resumeRun() {
		status = 'running';
		startTime = Date.now() - elapsed * 1000;
		timerInterval = setInterval(updateTimer, TIMER_INTERVAL_MS);
		acquireWakeLock();
		startGpsWatch();
		setupVisibilityHandler();
	}

	function resetConfirm() {
		confirmFinish = false;
		confirmDiscard = false;
		if (confirmTimer) {
			clearTimeout(confirmTimer);
			confirmTimer = null;
		}
	}

	function armConfirm(which: 'finish' | 'discard') {
		resetConfirm();
		if (which === 'finish') confirmFinish = true;
		else confirmDiscard = true;
		confirmTimer = setTimeout(resetConfirm, 4000);
	}

	function requestFinish() {
		if (finishing) return;
		if (!confirmFinish) {
			armConfirm('finish');
			return;
		}
		resetConfirm();
		finishRun();
	}

	function requestNewRun() {
		if (saveError && !confirmDiscard) {
			armConfirm('discard');
			return;
		}
		resetRun();
	}

	function finishRun() {
		if (finishing) return;
		finishing = true;
		saveError = null;
		status = 'finished';
		if (timerInterval) clearInterval(timerInterval);
		stopGpsWatch();
		releaseWakeLock();
		if (visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
			visibilityHandler = null;
		}
		persistState();

		const runData = buildRunPayload({
			gpsPoints,
			distance,
			elapsedDuration: elapsed,
			averageSpeed: averageSpeed / MS_TO_KMH,
			maxSpeed: maxSpeed / MS_TO_KMH,
			averagePace,
			bestPace,
			title: runTitle || undefined
		});

		saveRunApi(runData)
			.then((data) => {
				if (data.sessionId) {
					clearRunningState();
					goto(`/app/training/session/${data.sessionId}`);
				} else {
					throw new Error('Failed to save run. Please try again.');
				}
			})
			.catch((e) => {
				// Keep the run in localStorage and on screen so it can be retried.
				saveError = !navigator.onLine
					? 'You are offline. Connect to the internet and tap Retry Save.'
					: e instanceof Error
						? e.message
						: 'Failed to save run. Please try again.';
				finishing = false;
			});
	}

	function resetRun() {
		resetConfirm();
		status = 'idle';
		saveError = null;
		gpsError = null;
		finishing = false;
		distance = 0;
		elapsed = 0;
		currentSpeed = 0;
		averageSpeed = 0;
		maxSpeed = 0;
		currentPace = 0;
		averagePace = 0;
		bestPace = 0;
		currentPosition = null;
		gpsPoints = [];
		lastPoint = null;
		clearRunningState();
	}
</script>

<svelte:head>
	<title>Running - MegaOrganize</title>
</svelte:head>

<div class="flex h-[calc(100%-3rem)] flex-col overflow-hidden bg-bg text-fg select-none lg:h-full">
	{#if status === 'idle'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			{#if gpsError}
				<div
					class="mb-3 flex items-center gap-2 rounded-sm border border-error/30 bg-error/15 px-4 py-2 text-xs text-error"
				>
					<i class="fas fa-circle-exclamation"></i>
					<span>{gpsError}</span>
				</div>
			{/if}
			<i class="fas fa-person-running mb-6 text-6xl text-primary"></i>
			<h1 class="mb-2 text-lg font-semibold text-fg-accent">Ready to Run?</h1>
			<p class="mb-8 text-fg-subdued">GPS permission is required to track your run</p>
			<Button variant="primary" size="lg" onclick={requestGpsPermission}>
				<i class="fas fa-location-crosshairs mr-2"></i>
				Enable Location
			</Button>
		</div>
	{:else if status === 'requesting'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			<div class="mb-6 flex justify-center"><Spinner size="lg" /></div>
			<h1 class="mb-2 text-lg font-semibold text-fg-accent">Waiting for GPS...</h1>
			<p class="text-fg-subdued">Please allow location access</p>
		</div>
	{:else if status === 'running' || status === 'paused'}
		<div class="flex flex-1 flex-col">
			<div class="relative h-[45%] shrink-0 overflow-hidden">
				<RunMap
					points={gpsPoints}
					center={currentPosition}
					followPosition={true}
					showRoute={true}
					className="rounded-b-lg"
				/>
				{#if status === 'paused'}
					<div
						class="absolute top-3 left-3 z-[1000] rounded-sm bg-warning/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
					>
						PAUSED
					</div>
				{/if}
			</div>

			<div class="flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 select-text">
				{#if gpsError}
					<div
						class="mb-3 flex items-center gap-2 rounded-sm border border-warning/30 bg-warning/15 px-4 py-2 text-xs text-warning"
					>
						<i class="fas fa-satellite-dish"></i>
						<span>{gpsError}</span>
					</div>
				{/if}
				<div class="mb-4 flex w-full max-w-md justify-center">
					<input
						type="text"
						bind:value={runTitle}
						placeholder="Name this run (optional)"
						class="w-full max-w-xs touch-manipulation rounded-sm border border-border bg-surface px-3 py-1.5 text-center text-base text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none sm:text-sm"
					/>
				</div>
				<div class="mb-4 text-center">
					<div class="text-5xl font-bold tabular-nums">{formatTime(elapsed)}</div>
				</div>

				<div class="mb-4 grid w-full max-w-md grid-cols-2 gap-4 sm:gap-6">
					<div class="text-center">
						<div class="text-3xl font-bold tabular-nums">{(distance / 1000).toFixed(2)}</div>
						<div class="text-sm text-fg-subdued">km</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold tabular-nums">{formatPace(currentPace)}</div>
						<div class="text-sm text-fg-subdued">/km</div>
					</div>
				</div>

				<div class="mb-6 grid w-full max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
					<div>
						<div class="text-lg font-semibold tabular-nums">{formatPace(averagePace)}</div>
						<div class="text-[10px] text-fg-subdued">Avg Pace</div>
					</div>
					<div>
						<div class="text-lg font-semibold tabular-nums">{currentSpeed.toFixed(1)}</div>
						<div class="text-[10px] text-fg-subdued">km/h</div>
					</div>
					<div>
						<div class="text-lg font-semibold tabular-nums">{averageSpeed.toFixed(1)}</div>
						<div class="text-[10px] text-fg-subdued">Avg km/h</div>
					</div>
					<div>
						<div class="text-lg font-semibold tabular-nums">{maxSpeed.toFixed(1)}</div>
						<div class="text-[10px] text-fg-subdued">Max km/h</div>
					</div>
				</div>

				<div class="flex gap-4">
					{#if status === 'running'}
						<Button variant="secondary" size="lg" onclick={pauseRun}>
							<i class="fas fa-pause mr-2"></i> Pause
						</Button>
					{:else}
						<Button variant="primary" size="lg" onclick={resumeRun}>
							<i class="fas fa-play mr-2"></i> Resume
						</Button>
					{/if}
					<Button variant="danger" size="lg" disabled={finishing} onclick={requestFinish}>
						{#if finishing}
							<i class="fas fa-spinner fa-spin mr-2"></i> Saving...
						{:else if confirmFinish}
							<i class="fas fa-check mr-2"></i> Tap again to finish
						{:else}
							<i class="fas fa-stop mr-2"></i> Finish
						{/if}
					</Button>
				</div>
			</div>
		</div>
	{:else if status === 'finished'}
		<div class="flex flex-1 flex-col">
			<div class="relative h-[40%] shrink-0 overflow-hidden">
				<RunMap
					points={gpsPoints}
					center={gpsPoints.length > 0 ? gpsPoints[0] : undefined}
					showRoute={true}
					className="rounded-b-lg"
				/>
			</div>

			<div class="flex flex-1 flex-col items-center justify-center p-6">
				{#if saveError}
					<div
						class="mb-4 flex w-full max-w-md items-center gap-2 rounded-sm border border-error/30 bg-error/15 px-4 py-2 text-xs text-error"
					>
						<i class="fas fa-circle-exclamation"></i>
						<span>{saveError}</span>
					</div>
				{/if}
				<i class="fas fa-check-circle mb-4 text-5xl text-success"></i>
				<h1 class="mb-4 text-lg font-semibold text-fg-accent">Run Complete!</h1>

				<div class="mb-6 grid grid-cols-2 gap-6 text-center">
					<div>
						<div class="text-3xl font-bold">{(distance / 1000).toFixed(2)}</div>
						<div class="text-sm text-fg-subdued">km</div>
					</div>
					<div>
						<div class="text-3xl font-bold">{formatTime(elapsed)}</div>
						<div class="text-sm text-fg-subdued">duration</div>
					</div>
					<div>
						<div class="text-3xl font-bold">{formatPace(averagePace)}</div>
						<div class="text-sm text-fg-subdued">avg pace</div>
					</div>
					<div>
						<div class="text-3xl font-bold">{averageSpeed.toFixed(1)}</div>
						<div class="text-sm text-fg-subdued">avg km/h</div>
					</div>
				</div>

				<div class="flex gap-4">
					{#if saveError}
						<Button variant="primary" disabled={finishing} onclick={finishRun}>
							{#if finishing}<i class="fas fa-spinner fa-spin mr-2"></i>{/if}
							Retry Save
						</Button>
					{/if}
					<a
						href="/app/training/calendar"
						class="inline-flex h-12 items-center rounded-sm bg-primary px-6 font-medium text-white transition-colors hover:bg-primary-hover"
					>
						View History
					</a>
					<Button variant="secondary" onclick={requestNewRun}>
						{confirmDiscard ? 'Tap again to discard' : 'New Run'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
