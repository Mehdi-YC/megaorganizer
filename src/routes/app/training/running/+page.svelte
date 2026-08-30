<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let status = $state<'idle' | 'requesting' | 'running' | 'paused' | 'finished'>('idle');
	let startTime = $state<number>(0);
	let elapsed = $state(0);
	let distance = $state(0);
	let currentSpeed = $state(0);
	let averageSpeed = $state(0);
	let maxSpeed = $state(0);
	let currentPace = $state(0);
	let averagePace = $state(0);
	let gpsPoints = $state<Array<{
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		timestamp: number;
	}>>([]);
	let watchId: number | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let lastPoint: typeof gpsPoints[0] | null = null;

	onMount(() => {
		return () => {
			if (watchId !== null) {
				navigator.geolocation.clearWatch(watchId);
			}
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});

	function requestGpsPermission() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported by your browser');
			return;
		}
		status = 'requesting';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				status = 'running';
				startTracking();
			},
			(error) => {
				status = 'idle';
				alert('Location permission denied. Please enable location services.');
			},
			{ enableHighAccuracy: true }
		);
	}

	function startTracking() {
		startTime = Date.now();
		timerInterval = setInterval(updateTimer, 1000);

		watchId = navigator.geolocation.watchPosition(
			(position) => {
				const point = {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					altitude: position.coords.altitude ?? undefined,
					accuracy: position.coords.accuracy,
					speed: position.coords.speed ?? undefined,
					timestamp: position.timestamp
				};

				if (lastPoint) {
					const dist = calculateDistance(
						lastPoint.latitude,
						lastPoint.longitude,
						point.latitude,
						point.longitude
					);

					const timeDiff = (point.timestamp - lastPoint.timestamp) / 1000;
					if (timeDiff > 0 && dist > 0) {
						const speed = dist / timeDiff;
						if (speed < 20) {
							distance += dist;
							currentSpeed = speed * 3.6;
							maxSpeed = Math.max(maxSpeed, currentSpeed);
						}
					}
				}

				gpsPoints.push(point);
				lastPoint = point;
				updateStats();
			},
			(error) => {
				console.error('GPS error:', error);
			},
			{ enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
		);
	}

	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371;
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c * 1000;
	}

	function updateTimer() {
		if (status === 'running') {
			elapsed = Math.floor((Date.now() - startTime) / 1000);
			updateStats();
		}
	}

	function updateStats() {
		if (distance > 0 && elapsed > 0) {
			averageSpeed = (distance / elapsed) * 3.6;
			averagePace = elapsed / (distance / 1000);
			currentPace = currentSpeed > 0 ? 3600 / currentSpeed : 0;
		}
	}

	function pauseRun() {
		status = 'paused';
		if (timerInterval) clearInterval(timerInterval);
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);
	}

	function resumeRun() {
		status = 'running';
		startTime = Date.now() - elapsed * 1000;
		timerInterval = setInterval(updateTimer, 1000);
		startTracking();
	}

	function finishRun() {
		status = 'finished';
		if (timerInterval) clearInterval(timerInterval);
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);

		const runData = {
			distance,
			elapsedDuration: elapsed,
			averageSpeed: averageSpeed / 3.6,
			maxSpeed: maxSpeed / 3.6,
			averagePace,
			bestPace: 0,
			gpsPoints: gpsPoints.map((p, i) => ({
				sequence: i,
				timestamp: new Date(p.timestamp),
				latitude: p.latitude,
				longitude: p.longitude,
				altitude: p.altitude,
				accuracy: p.accuracy,
				speed: p.speed
			}))
		};

		fetch('/api/running', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'saveRun', ...runData })
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.sessionId) {
					goto(`/app/training/session/${data.sessionId}`);
				}
			});
	}

	function formatTime(seconds: number) {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function formatPace(secondsPerKm: number) {
		if (!secondsPerKm || !isFinite(secondsPerKm)) return '--:--';
		const mins = Math.floor(secondsPerKm / 60);
		const secs = Math.floor(secondsPerKm % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>Running - MegaOrganize</title>
</svelte:head>

<div class="flex h-full flex-col bg-bg text-fg">
	{#if status === 'idle'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			<i class="fas fa-person-running mb-6 text-6xl text-primary"></i>
			<h1 class="mb-2 text-lg font-semibold text-fg-accent">Ready to Run?</h1>
			<p class="mb-8 text-fg-subdued">GPS permission is required to track your run</p>
			<button
				type="button"
				class="h-14 w-full max-w-xs rounded-sm bg-primary text-lg font-medium text-white transition-colors hover:bg-primary-hover"
				onclick={requestGpsPermission}
			>
				<i class="fas fa-location-crosshairs mr-2"></i>
				Enable Location
			</button>
		</div>

	{:else if status === 'requesting'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			<div class="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			<h1 class="mb-2 text-lg font-semibold text-fg-accent">Waiting for GPS...</h1>
			<p class="text-fg-subdued">Please allow location access</p>
		</div>

	{:else if status === 'running' || status === 'paused'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			{#if status === 'paused'}
				<div class="mb-4 rounded-sm bg-yellow-500/20 px-4 py-2 text-sm text-yellow-400">
					PAUSED
				</div>
			{/if}

			<div class="mb-8 text-center">
				<div class="text-6xl font-bold tabular-nums">{formatTime(elapsed)}</div>
			</div>

			<div class="mb-8 grid w-full max-w-md grid-cols-2 gap-8">
				<div class="text-center">
					<div class="text-4xl font-bold tabular-nums">{(distance / 1000).toFixed(2)}</div>
				<div class="text-sm text-fg-subdued">km</div>
			</div>
			<div class="text-center">
				<div class="text-4xl font-bold tabular-nums">{formatPace(currentPace)}</div>
				<div class="text-sm text-fg-subdued">/km</div>
				</div>
			</div>

			<div class="mb-8 grid w-full max-w-md grid-cols-2 gap-6 text-center">
				<div>
					<div class="text-xl font-semibold tabular-nums">{formatPace(averagePace)}</div>
				<div class="text-xs text-fg-subdued">Avg Pace</div>
			</div>
			<div>
				<div class="text-xl font-semibold tabular-nums">{currentSpeed.toFixed(1)}</div>
				<div class="text-xs text-fg-subdued">km/h</div>
			</div>
			<div>
				<div class="text-xl font-semibold tabular-nums">{averageSpeed.toFixed(1)}</div>
				<div class="text-xs text-fg-subdued">Avg km/h</div>
			</div>
			<div>
				<div class="text-xl font-semibold tabular-nums">{maxSpeed.toFixed(1)}</div>
				<div class="text-xs text-fg-subdued">Max km/h</div>
				</div>
			</div>

			<div class="flex gap-4">
				{#if status === 'running'}
					<button
						type="button"
						class="h-16 w-32 rounded-sm bg-yellow-500 text-lg font-medium text-white transition-colors hover:bg-yellow-600"
						onclick={pauseRun}
					>
						<i class="fas fa-pause mr-2"></i>
						Pause
					</button>
				{:else}
					<button
						type="button"
						class="h-16 w-32 rounded-sm bg-primary text-lg font-medium text-white transition-colors hover:bg-primary-hover"
						onclick={resumeRun}
					>
						<i class="fas fa-play mr-2"></i>
						Resume
					</button>
				{/if}
				<button
					type="button"
					class="h-16 w-32 rounded-sm bg-error text-lg font-medium text-white transition-colors hover:bg-error/80"
					onclick={finishRun}
				>
					<i class="fas fa-stop mr-2"></i>
					Finish
				</button>
			</div>
		</div>

	{:else if status === 'finished'}
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			<i class="fas fa-check-circle mb-6 text-6xl text-green-400"></i>
			<h1 class="mb-4 text-lg font-semibold text-fg-accent">Run Complete!</h1>

			<div class="mb-8 grid grid-cols-2 gap-8 text-center">
				<div>
					<div class="text-4xl font-bold">{(distance / 1000).toFixed(2)}</div>
				<div class="text-sm text-fg-subdued">km</div>
			</div>
			<div>
				<div class="text-4xl font-bold">{formatTime(elapsed)}</div>
				<div class="text-sm text-fg-subdued">duration</div>
			</div>
			<div>
				<div class="text-4xl font-bold">{formatPace(averagePace)}</div>
				<div class="text-sm text-fg-subdued">avg pace</div>
			</div>
			<div>
				<div class="text-4xl font-bold">{averageSpeed.toFixed(1)}</div>
				<div class="text-sm text-fg-subdued">avg km/h</div>
				</div>
			</div>

			<div class="flex gap-4">
				<a
					href="/app/training/calendar"
					class="h-12 rounded-sm bg-primary px-6 font-medium text-white transition-colors hover:bg-primary-hover"
				>
					View History
				</a>
				<button
					type="button"
					class="h-12 rounded-sm border border-border bg-surface px-6 font-medium text-fg transition-colors hover:bg-border"
					onclick={() => {
						status = 'idle';
						distance = 0;
						elapsed = 0;
						currentSpeed = 0;
						averageSpeed = 0;
						maxSpeed = 0;
						currentPace = 0;
						averagePace = 0;
						gpsPoints = [];
						lastPoint = null;
					}}
				>
					New Run
				</button>
			</div>
		</div>
	{/if}
</div>
