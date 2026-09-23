<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	let name = $state(data.user?.name ?? '');

	// Finance settings
	// svelte-ignore state_referenced_locally
	let currency = $state(data.financeSettings?.currency ?? 'DZD');
	// svelte-ignore state_referenced_locally
	let currencyRate = $state(data.financeSettings?.currencyRate ?? 1);
	// svelte-ignore state_referenced_locally
	let monthlySpendingLimit = $state(data.financeSettings?.monthlySpendingLimit ?? '');

	let importStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let importMessage = $state('');
	let importCounts = $state<Record<string, number> | null>(null);
	let importInput = $state<HTMLInputElement | null>(null);

	const COUNT_LABELS: Record<string, string> = {
		categories: 'categories',
		pages: 'pages',
		elements: 'elements',
		relationships: 'links',
		tags: 'tags',
		attachments: 'files',
		reminderTemplates: 'reminder templates',
		reminders: 'reminders',
		templateTodos: 'template todos',
		reminderTodos: 'reminder todos',
		expenses: 'expenses',
		sessions: 'sessions',
		activities: 'activities',
		activityItems: 'activity links',
		exerciseRecords: 'exercise records',
		runningStats: 'runs',
		trackPoints: 'GPS points',
		roadmaps: 'roadmaps',
		roadmapNodes: 'roadmap nodes',
		roadmapEdges: 'roadmap edges',
		tierLists: 'tier lists',
		tiers: 'tiers',
		tierEntries: 'tier entries',
		ydkDecks: 'ydk decks',
		ydkEntries: 'ydk cards',
		timers: 'timers',
		timerSteps: 'timer steps',
		settings: 'settings'
	};

	async function exportBackup() {
		try {
			const res = await fetch('/api/backup');
			if (!res.ok) throw new Error('Export failed');
			const data = await res.json();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `megaorganize-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			importStatus = 'error';
			importMessage = 'Failed to export data';
		}
	}

	function triggerImport() {
		importInput?.click();
	}

	async function handleImportFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importStatus = 'loading';
		importMessage = '';
		importCounts = null;

		try {
			const text = await file.text();
			const jsonData = JSON.parse(text);
			const res = await fetch('/api/backup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(jsonData)
			});
			const result = await res.json();
			if (result.success) {
				importStatus = 'success';
				importMessage = result.message;
				importCounts = result.counts;
			} else {
				importStatus = 'error';
				importMessage = result.message || 'Import failed';
			}
		} catch (err) {
			importStatus = 'error';
			importMessage = 'Invalid backup file';
		}

		input.value = '';
	}
</script>

<svelte:head>
	<title>Edit Profile - MegaOrganize</title>
</svelte:head>

<div class="max-w-2xl p-4 sm:p-8">
	<div class="mb-6">
		<a href="/app" class="text-sm text-fg-subdued transition-colors hover:text-fg">
			<i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
		</a>
	</div>

	<PageHeader title="Edit Profile" />

	<div class="rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Profile</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
				<Input label="Name" type="text" id="name" name="name" bind:value={name} required />

				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-xs font-semibold tracking-wide text-fg-accent">Email</label
					>
					<input
						type="email"
						id="email"
						value={data.user?.email}
						disabled
						class="h-[36px] w-full cursor-not-allowed rounded-sm border border-border bg-muted px-3 text-sm text-fg-subdued"
					/>
					<p class="text-[10px] text-fg-subdued">Email cannot be changed</p>
				</div>

				{#if form?.profileMessage}
					<p class="text-xs {form.profileMessage.ok ? 'text-green-600' : 'text-error'}">
						{form.profileMessage.text}
					</p>
				{/if}

				<Button type="submit">Save Changes</Button>
			</form>
		</div>
	</div>

	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Change Password</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/changePassword" use:enhance class="space-y-4">
				<Input
					label="Current Password"
					type="password"
					id="currentPassword"
					name="currentPassword"
					required
					placeholder="••••••••"
				/>

				<Input
					label="New Password"
					type="password"
					id="newPassword"
					name="newPassword"
					required
					minlength={8}
					placeholder="••••••••"
				/>

				<Input
					label="Confirm New Password"
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					required
					minlength={8}
					placeholder="••••••••"
				/>

				{#if form?.passwordMessage}
					<p class="text-xs {form.passwordMessage.ok ? 'text-green-600' : 'text-error'}">
						{form.passwordMessage.text}
					</p>
				{/if}

				<Button type="submit">Change Password</Button>
			</form>
		</div>
	</div>

	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Backup & Restore</h2>
		</div>
		<div class="space-y-4 px-6 py-5">
			<p class="text-xs text-fg-subdued">
				Export all your data as a JSON file, or restore from a previous backup. Existing items with
				the same name will be skipped.
			</p>

			<div class="flex flex-col gap-2 sm:flex-row">
				<Button type="button" onclick={exportBackup}>
					<i class="fas fa-download text-xs"></i> Export Backup
				</Button>
				<Button variant="secondary" type="button" onclick={triggerImport}>
					<i class="fas fa-upload text-xs"></i> Import Backup
				</Button>
				<input
					type="file"
					accept=".json"
					class="hidden"
					bind:this={importInput}
					onchange={handleImportFile}
				/>
			</div>
			<p class="text-[10px] text-fg-subdued/60">
				Includes everything: library (categories, pages, items, tags, attachments), reminders,
				expenses, settings, training runs with GPS, roadmaps, tier lists, YDK decks, and timers.
			</p>

			{#if importStatus === 'loading'}
				<div class="flex items-center gap-2 text-xs text-fg-subdued">
					<i class="fas fa-spinner fa-spin text-xs"></i> Importing...
				</div>
			{:else if importStatus === 'success'}
				<div class="rounded-sm border border-green-500/30 bg-green-500/10 px-4 py-3">
					<p class="text-xs font-medium text-green-500">{importMessage}</p>
					{#if importCounts}
						<div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-subdued">
							{#each Object.entries(importCounts).filter(([key, n]) => key !== 'skipped' && n > 0) as [key, n] (key)}
								<span>{n} {COUNT_LABELS[key] ?? key}</span>
							{/each}
							{#if importCounts.skipped}<span class="text-fg-subdued/60"
									>({importCounts.skipped} skipped)</span
								>{/if}
						</div>
					{/if}
				</div>
			{:else if importStatus === 'error'}
				<div class="rounded-sm border border-error/30 bg-error/10 px-4 py-3">
					<p class="text-xs font-medium text-error">{importMessage}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Finance Settings -->
	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Finance Settings</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/updateFinanceSettings" use:enhance class="space-y-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Currency"
						type="text"
						id="currency"
						name="currency"
						bind:value={currency}
						placeholder="DZD"
					/>
					<Input
						label="Currency Rate (to USD)"
						type="number"
						id="currencyRate"
						name="currencyRate"
						bind:value={currencyRate}
						step={0.0001}
						min={0}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label
						for="monthlySpendingLimit"
						class="text-xs font-semibold tracking-wide text-fg-accent"
						>Monthly Spending Limit ({currency})</label
					>
					<input
						type="number"
						id="monthlySpendingLimit"
						name="monthlySpendingLimit"
						bind:value={monthlySpendingLimit}
						step="0.01"
						min="0"
						placeholder="No limit"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary focus:ring-0 focus:outline-none"
					/>
					<p class="text-[10px] text-fg-subdued">Leave empty for no limit</p>
				</div>

				{#if form?.financeMessage}
					<p class="text-xs {form.financeMessage.ok ? 'text-green-600' : 'text-error'}">
						{form.financeMessage.text}
					</p>
				{/if}

				<Button type="submit">Save Finance Settings</Button>
			</form>
		</div>
	</div>
</div>
