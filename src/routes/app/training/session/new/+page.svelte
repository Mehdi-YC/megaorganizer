<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { formatTime, formatPace } from '$lib/utils';
	import RunMap from '$lib/components/ui/RunMap.svelte';

	let { data } = $props();
	let title = $state('');
	let notes = $state('');
	let saving = $state(false);

	let activityType = $state<'strength' | 'running' | 'cycling' | 'walking' | 'swimming' | 'other'>('strength');
	let selectedItems = $state<string[]>([]);
	let exerciseRecords = $state<Array<{
		itemId: string;
		sets: number;
		reps: string;
		weight: number;
		unit: string;
		rpe: number;
		restTime: number;
		notes: string;
	}>>([]);

	let elapsedTime = $state(0);
	let timerRunning = $state(false);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let startTime = $state(0);
	let finished = $state(false);

	const gpsTypes = ['running', 'cycling', 'walking'];
	let isGpsActivity = $derived(gpsTypes.includes(activityType));

	let gpsStatus = $state<'idle' | 'requesting' | 'tracking' | 'paused'>('idle');
	let currentPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let gpsPoints = $state<Array<{
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		timestamp: number;
	}>>([]);
	let distance = $state(0);
	let currentSpeed = $state(0);
	let averageSpeed = $state(0);
	let averagePace = $state(0);
	let currentPace = $state(0);
	let watchId: number | null = null;
	let lastPoint: typeof gpsPoints[0] | null = null;

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);
	});

	function startTimer() {
		if (timerRunning) return;
		startTime = Date.now() - elapsedTime * 1000;
		timerRunning = true;
		timerInterval = setInterval(() => {
			elapsedTime = Math.floor((Date.now() - startTime) / 1000);
			updateStats();
		}, 1000);
	}

	function pauseTimer() {
		timerRunning = false;
		if (timerInterval) clearInterval(timerInterval);
	}

	function startGpsTracking() {
		if (!navigator.geolocation) {
			alert('Geolocation is not supported');
			return;
		}
		gpsStatus = 'requesting';
		navigator.geolocation.getCurrentPosition(
			() => {
				gpsStatus = 'tracking';
				startTimer();
				beginWatch();
			},
			() => {
				gpsStatus = 'idle';
				alert('Location permission denied');
			},
			{ enableHighAccuracy: true }
		);
	}

	function beginWatch() {
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
				currentPosition = { latitude: point.latitude, longitude: point.longitude };

				if (lastPoint) {
					const dist = calcDistance(lastPoint.latitude, lastPoint.longitude, point.latitude, point.longitude);
					const timeDiff = (point.timestamp - lastPoint.timestamp) / 1000;
					if (timeDiff > 0 && dist > 0) {
						const speed = dist / timeDiff;
						if (speed < 20) {
							distance += dist;
							currentSpeed = speed * 3.6;
						}
					}
				}
				gpsPoints = [...gpsPoints, point];
				lastPoint = point;
				updateStats();
			},
			(error) => console.error('GPS error:', error),
			{ enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
		);
	}

	function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371;
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
	}

	function updateStats() {
		if (distance > 0 && elapsedTime > 0) {
			averageSpeed = (distance / elapsedTime) * 3.6;
			averagePace = elapsedTime / (distance / 1000);
			currentPace = currentSpeed > 0 ? 3600 / currentSpeed : 0;
		}
	}

	function toggleItem(itemId: string) {
		if (selectedItems.includes(itemId)) {
			selectedItems = selectedItems.filter((id) => id !== itemId);
			exerciseRecords = exerciseRecords.filter((r) => r.itemId !== itemId);
		} else {
			selectedItems = [...selectedItems, itemId];
			exerciseRecords = [...exerciseRecords, { itemId, sets: 3, reps: '10', weight: 0, unit: 'kg', rpe: 7, restTime: 90, notes: '' }];
		}
	}

	function updateRecord(itemId: string, field: string, value: any) {
		exerciseRecords = exerciseRecords.map((r) => r.itemId === itemId ? { ...r, [field]: value } : r);
	}

	async function saveSession() {
		if (saving) return;
		saving = true;

		try {
			if (isGpsActivity && gpsPoints.length > 0) {
				const runData = {
					distance,
					elapsedDuration: elapsedTime,
					averageSpeed: averageSpeed / 3.6,
					maxSpeed: currentSpeed / 3.6,
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

				const res = await fetch('/api/running', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'saveRun', ...runData })
				});

				const result = await res.json();
				if (result.sessionId) {
					if (title) {
						await fetch('/api/training', {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ action: 'updateSession', sessionId: result.sessionId, title })
						});
					}
					goto(`/app/training/session/${result.sessionId}`);
					return;
				}
			}

			const sessionRes = await fetch('/api/training', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'createSession',
					title: title || undefined,
					notes: notes || undefined,
					startedAt: new Date(startTime || Date.now()).toISOString()
				})
			});

			if (!sessionRes.ok) throw new Error('Failed to create session');
			const session = await sessionRes.json();

			const activityRes = await fetch('/api/training', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'createActivity',
					sessionId: session.id,
					type: activityType,
					startedAt: new Date(startTime || Date.now()).toISOString()
				})
			});

			if (!activityRes.ok) throw new Error('Failed to create activity');
			const activity = await activityRes.json();

			for (const record of exerciseRecords) {
				await fetch('/api/training', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'createExerciseRecord',
						activityId: activity.id,
						itemId: record.itemId,
						sets: record.sets,
						reps: record.reps,
						weight: record.weight,
						unit: record.unit,
						rpe: record.rpe,
						restTime: record.restTime,
						notes: record.notes || undefined
					})
				});
			}

			await fetch('/api/training', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'updateSession',
					sessionId: session.id,
					status: 'completed',
					endedAt: new Date().toISOString(),
					duration: elapsedTime
				})
			});

			goto(`/app/training/session/${session.id}`);
		} catch (e) {
			console.error('Failed to save session:', e);
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Session - Training - MegaOrganize</title>
	{#if isGpsActivity}
		<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	{/if}
</svelte:head>

<div class="p-4 sm:p-8 max-w-2xl">
	<div class="mb-6">
		<a href="/app/training" class="text-sm text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left mr-1"></i> Back to Training
		</a>
	</div>

	<h1 class="text-lg font-semibold text-fg-accent mb-6">New Training Session</h1>

	{#if !finished}
		{#if isGpsActivity}
			<div class="rounded-sm border border-border bg-surface p-6 mb-6">
				{#if gpsStatus === 'idle'}
					<div class="text-center py-8">
						<i class="fas fa-location-crosshairs mb-4 text-4xl text-primary"></i>
						<p class="text-fg-subdued mb-4">GPS tracking for {activityType}</p>
						<button
							type="button"
							class="h-12 px-8 rounded-sm bg-primary text-sm font-medium text-white hover:bg-primary-hover transition-colors"
							onclick={startGpsTracking}
						>
							<i class="fas fa-play mr-2"></i> Start {activityType}
						</button>
					</div>
				{:else if gpsStatus === 'requesting'}
					<div class="text-center py-8">
						<div class="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
						<p class="text-fg-subdued">Waiting for GPS...</p>
					</div>
				{:else}
					<div class="relative overflow-hidden rounded-sm mb-4" style="height: 300px;">
						<RunMap
							points={gpsPoints}
							center={currentPosition}
							followPosition={true}
							showRoute={true}
							className="rounded-sm"
						/>
					</div>

					<div class="text-center mb-4">
						<div class="text-4xl font-bold tabular-nums">{formatTime(elapsedTime)}</div>
					</div>

					<div class="grid grid-cols-2 gap-4 mb-4 text-center">
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
				{/if}
			</div>
		{:else}
			<div class="rounded-sm border border-border bg-surface p-6 mb-6">
				<div class="text-center mb-6">
					<div class="text-5xl font-bold tabular-nums text-fg mb-2">{formatTime(elapsedTime)}</div>
					{#if timerRunning}
						<button
							type="button"
							class="h-10 px-6 rounded-sm bg-yellow-500 text-sm font-medium text-white hover:bg-yellow-600 transition-colors"
							onclick={pauseTimer}
						>
							<i class="fas fa-pause mr-2"></i> Pause
						</button>
					{:else}
						<button
							type="button"
							class="h-10 px-6 rounded-sm bg-primary text-sm font-medium text-white hover:bg-primary-hover transition-colors"
							onclick={startTimer}
						>
							<i class="fas fa-play mr-2"></i> {elapsedTime > 0 ? 'Resume' : 'Start'}
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<div class="space-y-6">
			<div>
				<label for="title" class="mb-1 block text-sm font-medium text-fg">Title</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					placeholder="e.g. Upper Body, Leg Day, Morning Run..."
					class="w-full h-10 rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
				/>
			</div>

			<div>
				<label for="type" class="mb-1 block text-sm font-medium text-fg">Activity Type</label>
				<select
					id="type"
					bind:value={activityType}
					class="w-full h-10 rounded-sm border border-border bg-bg px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-0"
				>
					<option value="strength">Strength</option>
					<option value="running">Running</option>
					<option value="cycling">Cycling</option>
					<option value="walking">Walking</option>
					<option value="swimming">Swimming</option>
					<option value="other">Other</option>
				</select>
			</div>

			{#if activityType === 'strength'}
				<div>
					<h3 class="mb-2 text-sm font-medium text-fg">Exercises</h3>
					<p class="mb-3 text-xs text-fg-subdued">Select items to add as exercises</p>
					<div class="space-y-1 max-h-48 overflow-y-auto rounded-sm border border-border bg-bg p-2">
						{#each data.items as item}
							<label class="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors">
								<input
									type="checkbox"
									checked={selectedItems.includes(item.id)}
									onchange={() => toggleItem(item.id)}
									class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
								/>
								<span class="text-sm text-fg">{item.name}</span>
							</label>
						{/each}
						{#if data.items.length === 0}
							<p class="py-4 text-center text-xs text-fg-subdued">No items in library. Create items first.</p>
						{/if}
					</div>
				</div>

				{#if exerciseRecords.length > 0}
					<div class="space-y-3">
						<h3 class="text-sm font-medium text-fg">Exercise Records</h3>
						{#each exerciseRecords as record}
							{@const item = data.items.find((i: any) => i.id === record.itemId)}
							<div class="rounded-sm border border-border bg-bg p-3">
								<p class="text-sm font-medium text-fg mb-2">{item?.name || 'Exercise'}</p>
								<div class="grid grid-cols-3 gap-2">
									<div>
										<label class="text-[10px] text-fg-subdued">Sets</label>
										<input type="number" value={record.sets} onchange={(e) => updateRecord(record.itemId, 'sets', parseInt(e.currentTarget.value) || 3)} class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none" />
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Reps</label>
										<input type="text" value={record.reps} onchange={(e) => updateRecord(record.itemId, 'reps', e.currentTarget.value)} class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none" />
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Weight</label>
										<div class="flex">
											<input type="number" value={record.weight} onchange={(e) => updateRecord(record.itemId, 'weight', parseFloat(e.currentTarget.value) || 0)} class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none" />
											<span class="ml-1 text-[10px] text-fg-subdued self-center">kg</span>
										</div>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">RPE</label>
										<input type="number" min="1" max="10" value={record.rpe} onchange={(e) => updateRecord(record.itemId, 'rpe', parseInt(e.currentTarget.value) || 7)} class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none" />
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Rest (s)</label>
										<input type="number" value={record.restTime} onchange={(e) => updateRecord(record.itemId, 'restTime', parseInt(e.currentTarget.value) || 90)} class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none" />
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Notes</label>
										<input type="text" value={record.notes} onchange={(e) => updateRecord(record.itemId, 'notes', e.currentTarget.value)} placeholder="optional" class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none" />
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<div>
				<label for="notes" class="mb-1 block text-sm font-medium text-fg">Notes</label>
				<textarea
					id="notes"
					bind:value={notes}
					rows="3"
					placeholder="Optional notes..."
					class="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
				></textarea>
			</div>
		</div>
	{:else}
		<div class="text-center py-12">
			<i class="fas fa-check-circle text-5xl text-green-400 mb-4"></i>
			<h2 class="text-lg font-semibold text-fg-accent mb-2">Session Saved!</h2>
		</div>
	{/if}

	<div class="mt-6 flex gap-3">
		{#if isGpsActivity && gpsStatus === 'tracking'}
			<button
				type="button"
				disabled={saving}
				class="h-10 px-6 rounded-sm bg-error text-sm font-medium text-white hover:bg-error/80 transition-colors disabled:opacity-50"
				onclick={saveSession}
			>
				<i class="fas fa-stop mr-2"></i> Finish
			</button>
		{:else}
			<button
				type="button"
				disabled={saving}
				class="h-10 px-6 rounded-sm bg-primary text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
				onclick={saveSession}
			>
				{#if saving}
					<i class="fas fa-spinner fa-spin mr-2"></i>
				{/if}
				Save Session
			</button>
		{/if}
		<a
			href="/app/training"
			class="h-10 px-6 rounded-sm border border-border bg-surface text-sm font-medium text-fg hover:bg-muted transition-colors inline-flex items-center"
		>
			Cancel
		</a>
	</div>
</div>
