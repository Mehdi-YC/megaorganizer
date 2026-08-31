<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatTime } from '$lib/utils';

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

	function startTimer() {
		if (timerRunning) return;
		startTime = Date.now() - elapsedTime * 1000;
		timerRunning = true;
		timerInterval = setInterval(() => {
			elapsedTime = Math.floor((Date.now() - startTime) / 1000);
		}, 1000);
	}

	function pauseTimer() {
		timerRunning = false;
		if (timerInterval) clearInterval(timerInterval);
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

	function updateRecord(itemId: string, field: string, value: any) {
		exerciseRecords = exerciseRecords.map((r) =>
			r.itemId === itemId ? { ...r, [field]: value } : r
		);
	}

	async function saveSession() {
		if (saving) return;
		saving = true;

		try {
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
</svelte:head>

<div class="p-4 sm:p-8 max-w-2xl">
	<div class="mb-6">
		<a href="/app/training" class="text-sm text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left mr-1"></i> Back to Training
		</a>
	</div>

	<h1 class="text-lg font-semibold text-fg-accent mb-6">New Training Session</h1>

	{#if !finished}
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
										<input
											type="number"
											value={record.sets}
											onchange={(e) => updateRecord(record.itemId, 'sets', parseInt(e.currentTarget.value) || 3)}
											class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Reps</label>
										<input
											type="text"
											value={record.reps}
											onchange={(e) => updateRecord(record.itemId, 'reps', e.currentTarget.value)}
											class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Weight</label>
										<div class="flex">
											<input
												type="number"
												value={record.weight}
												onchange={(e) => updateRecord(record.itemId, 'weight', parseFloat(e.currentTarget.value) || 0)}
												class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
											/>
											<span class="ml-1 text-[10px] text-fg-subdued self-center">kg</span>
										</div>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">RPE</label>
										<input
											type="number"
											min="1"
											max="10"
											value={record.rpe}
											onchange={(e) => updateRecord(record.itemId, 'rpe', parseInt(e.currentTarget.value) || 7)}
											class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Rest (s)</label>
										<input
											type="number"
											value={record.restTime}
											onchange={(e) => updateRecord(record.itemId, 'restTime', parseInt(e.currentTarget.value) || 90)}
											class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
										/>
									</div>
									<div>
										<label class="text-[10px] text-fg-subdued">Notes</label>
										<input
											type="text"
											value={record.notes}
											onchange={(e) => updateRecord(record.itemId, 'notes', e.currentTarget.value)}
											placeholder="optional"
											class="w-full h-8 rounded-sm border border-border bg-surface px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none"
										/>
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
		<a
			href="/app/training"
			class="h-10 px-6 rounded-sm border border-border bg-surface text-sm font-medium text-fg hover:bg-muted transition-colors inline-flex items-center"
		>
			Cancel
		</a>
	</div>
</div>
