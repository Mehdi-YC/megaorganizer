<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import { enablePush, disablePush } from '$lib/utils/push-client';
	import { themeState } from '$lib/utils/theme.svelte';
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

	// Invoicing profile settings
	// svelte-ignore state_referenced_locally
	let brandName = $state(data.invoicingProfile?.brandName ?? '');
	// svelte-ignore state_referenced_locally
	let brandTagline = $state(data.invoicingProfile?.brandTagline ?? '');
	// svelte-ignore state_referenced_locally
	let address = $state(data.invoicingProfile?.address ?? '');
	// svelte-ignore state_referenced_locally
	let phone = $state(data.invoicingProfile?.phone ?? '');
	// svelte-ignore state_referenced_locally
	let nif = $state(data.invoicingProfile?.nif ?? '');
	// svelte-ignore state_referenced_locally
	let anae = $state(data.invoicingProfile?.anae ?? '');
	// svelte-ignore state_referenced_locally
	let rc = $state(data.invoicingProfile?.rc ?? '');
	// svelte-ignore state_referenced_locally
	let nis = $state(data.invoicingProfile?.nis ?? '');
	// svelte-ignore state_referenced_locally
	let ai = $state(data.invoicingProfile?.ai ?? '');
	// svelte-ignore state_referenced_locally
	let rib = $state(data.invoicingProfile?.rib ?? '');

	// MCP connection snippet, prefilled with this account's email.
	const mcpSnippet = $derived(
		JSON.stringify(
			{
				$schema: 'https://opencode.ai/config.json',
				mcp: {
					megaorganize: {
						type: 'remote',
						url: data.mcpUrl,
						oauth: false,
						headers: {
							Authorization: `Bearer ${data.user?.email ?? 'you@example.com'}:<your-password>`
						}
					}
				}
			},
			null,
			2
		)
	);
	let copied = $state(false);

	async function copySnippet() {
		try {
			await navigator.clipboard.writeText(mcpSnippet);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard access can be denied; the snippet stays selectable.
		}
	}

	let importStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let importMessage = $state('');
	let importCounts = $state<Record<string, number> | null>(null);
	let importInput = $state<HTMLInputElement | null>(null);

	// Push notifications
	let pushSupported = $state(true);
	let pushConfigured = $state(false);
	let pushSubscribed = $state(false);
	let pushBusy = $state(false);
	let pushError = $state('');

	onMount(async () => {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			pushSupported = false;
			return;
		}
		try {
			const res = await fetch('/api/push');
			if (!res.ok) return;
			const info = await res.json();
			pushConfigured = info.configured;
			pushSubscribed = info.subscribed;
		} catch {
			// Settings remain usable without push status.
		}
	});

	async function togglePush() {
		if (pushBusy) return;
		pushBusy = true;
		pushError = '';
		try {
			if (pushSubscribed) {
				await disablePush();
				pushSubscribed = false;
			} else {
				pushSubscribed = await enablePush();
				if (!pushSubscribed) pushError = 'Could not enable push on this device.';
			}
		} finally {
			pushBusy = false;
		}
	}

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
		todos: 'tasks',
		invoiceClients: 'clients',
		invoiceProducts: 'services',
		invoices: 'invoices',
		invoiceLines: 'invoice lines',
		invoiceDocs: 'tax returns (G12/G12 bis)',
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
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `megaorganize-backup-${new Date().toISOString().split('T')[0]}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {
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
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/backup', {
				method: 'POST',
				body: formData
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
		} catch {
			importStatus = 'error';
			importMessage = 'Invalid backup file';
		}

		input.value = '';
	}
</script>

<svelte:head>
	<title>Edit Profile - MegaOrganize</title>
</svelte:head>

<div class="max-w-2xl px-3.5 py-4 sm:p-6 lg:p-8">
	<div class="mb-6">
		<a href={resolve('/app')} class="text-sm text-fg-subdued transition-colors hover:text-fg">
			<i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
		</a>
	</div>

	<PageHeader title="Edit Profile" />

	<!-- Appearance & Theme Selector -->
	<div class="mb-6 rounded-xl border border-border bg-surface p-6 shadow-xs">
		<div class="mb-4">
			<h2 class="text-sm font-semibold tracking-tight text-fg">Appearance & Theme</h2>
			<p class="text-xs text-fg-subdued">Customize how MegaOrganize looks on your device.</p>
		</div>

		<div class="grid grid-cols-3 gap-3">
			<button
				type="button"
				class="flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 p-3 text-center transition-all {themeState.theme ===
				'light'
					? 'border-primary bg-primary/5 font-semibold shadow-xs'
					: 'border-border bg-muted/30 text-fg-subdued hover:border-border-strong hover:text-fg'}"
				onclick={() => themeState.setTheme('light')}
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"
				>
					<i class="fas fa-sun text-base"></i>
				</div>
				<span class="text-xs">Light Mode</span>
			</button>

			<button
				type="button"
				class="flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 p-3 text-center transition-all {themeState.theme ===
				'dark'
					? 'border-primary bg-primary/5 font-semibold shadow-xs'
					: 'border-border bg-muted/30 text-fg-subdued hover:border-border-strong hover:text-fg'}"
				onclick={() => themeState.setTheme('dark')}
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"
				>
					<i class="fas fa-moon text-base"></i>
				</div>
				<span class="text-xs">Dark Mode</span>
			</button>

			<button
				type="button"
				class="flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 p-3 text-center transition-all {themeState.theme ===
				'system'
					? 'border-primary bg-primary/5 font-semibold shadow-xs'
					: 'border-border bg-muted/30 text-fg-subdued hover:border-border-strong hover:text-fg'}"
				onclick={() => themeState.setTheme('system')}
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-fg-subdued">
					<i class="fas fa-circle-half-stroke text-base"></i>
				</div>
				<span class="text-xs">System Auto</span>
			</button>
		</div>
	</div>

	<div class="rounded-xl border border-border bg-surface shadow-xs">
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
					<p class="text-xs {form.profileMessage.ok ? 'text-success' : 'text-error'}">
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
					<p class="text-xs {form.passwordMessage.ok ? 'text-success' : 'text-error'}">
						{form.passwordMessage.text}
					</p>
				{/if}

				<Button type="submit">Change Password</Button>
			</form>
		</div>
	</div>

	<!-- Modules & Features Toggles -->
	<div class="mt-6 rounded-xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border/80 px-6 py-4">
			<h2 class="text-sm font-semibold tracking-tight text-fg">Features & Modular Capabilities</h2>
			<p class="mt-0.5 text-xs text-fg-subdued">
				Enable or hide modular capabilities based on your workflow. Disabled modules are hidden from
				navigation and associated views.
			</p>
		</div>
		<form method="post" action="?/updateFeatures" class="space-y-4 px-6 py-5">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="todos"
						checked={data.enabledFeatures?.todos ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Tasks (Todos)</div>
						<div class="text-[11px] text-fg-subdued">Daily tasks, scheduling, and priorities</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="reminders"
						checked={data.enabledFeatures?.reminders ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Reminders & Habits</div>
						<div class="text-[11px] text-fg-subdued">Recurring reminders and alert schedules</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="finance"
						checked={data.enabledFeatures?.finance ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Finance & Expenses</div>
						<div class="text-[11px] text-fg-subdued">Spending logs and monthly budget limit</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="invoicing"
						checked={data.enabledFeatures?.invoicing ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Invoicing</div>
						<div class="text-[11px] text-fg-subdued">Client invoices and annual tax dossiers</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="training"
						checked={data.enabledFeatures?.training ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Training & Fitness</div>
						<div class="text-[11px] text-fg-subdued">Workout logs, intervals, and GPS running</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="mindmap"
						checked={data.enabledFeatures?.mindmap ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Mindmap (Interactive Graph)</div>
						<div class="text-[11px] text-fg-subdued">
							Visual network of wiki notes & relationships
						</div>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-muted/50"
				>
					<input
						type="checkbox"
						name="ydk"
						checked={data.enabledFeatures?.ydk ?? true}
						class="rounded border-border text-primary focus:ring-primary"
					/>
					<div>
						<div class="text-xs font-semibold text-fg">Yu-Gi-Oh (YDK)</div>
						<div class="text-[11px] text-fg-subdued">Deck builder and card catalog viewer</div>
					</div>
				</label>
			</div>

			<div class="flex items-center justify-between pt-2">
				<Button type="submit">Save Modules</Button>
				{#if form?.featuresMessage}
					<span class="text-xs {form.featuresMessage.ok ? 'text-success' : 'text-error'}">
						{form.featuresMessage.text}
					</span>
				{/if}
			</div>
		</form>
	</div>

	<div class="mt-6 rounded-xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border/80 px-6 py-4">
			<h2 class="text-sm font-semibold tracking-tight text-fg">Backup & Restore</h2>
		</div>
		<div class="space-y-4 px-6 py-5">
			<p class="text-xs text-fg-subdued">
				Export all your data and attachments as a ZIP archive, or restore from a previous backup
				(.zip or .json). Existing items with identical identifiers will be safely preserved.
			</p>

			<div class="flex flex-col gap-2 sm:flex-row">
				<Button type="button" onclick={exportBackup}>
					<i class="fas fa-download text-xs"></i> Export Backup (ZIP)
				</Button>
				<Button variant="secondary" type="button" onclick={triggerImport}>
					<i class="fas fa-upload text-xs"></i> Import Backup
				</Button>
				<input
					type="file"
					accept=".zip,.json"
					class="hidden"
					bind:this={importInput}
					onchange={handleImportFile}
				/>
			</div>
			<p class="text-[10px] text-fg-subdued/60">
				Includes all entities and files: knowledge base, attachments, tasks, reminders, expenses,
				invoicing, tax documents (G12/G12 bis), GPS workouts, roadmaps, tier lists, YDK decks, and
				timers.
			</p>

			{#if importStatus === 'loading'}
				<div class="flex items-center gap-2 text-xs text-fg-subdued">
					<i class="fas fa-spinner fa-spin text-xs"></i> Importing...
				</div>
			{:else if importStatus === 'success'}
				<div class="rounded-sm border border-success/30 bg-success/10 px-4 py-3">
					<p class="text-xs font-medium text-success">{importMessage}</p>
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

	<!-- Push Notifications -->
	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
				Push Notifications
			</h2>
		</div>
		<div class="space-y-3 px-6 py-5">
			<p class="text-xs text-fg-subdued">
				Get reminder notifications on this device even when the app is closed.
			</p>
			{#if !pushSupported}
				<p class="text-xs text-fg-subdued">This browser does not support push notifications.</p>
			{:else if !pushConfigured}
				<p class="text-xs text-fg-subdued">
					Push is not configured on the server (missing VAPID keys).
				</p>
			{:else}
				<div class="flex items-center gap-3">
					<Button
						type="button"
						variant={pushSubscribed ? 'secondary' : 'primary'}
						disabled={pushBusy}
						onclick={togglePush}
					>
						{pushSubscribed ? 'Disable on this device' : 'Enable on this device'}
					</Button>
					{#if pushSubscribed}
						<span class="text-xs text-success">Enabled</span>
					{/if}
				</div>
				{#if pushError}
					<p class="text-xs text-error">{pushError}</p>
				{/if}
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
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg transition-colors placeholder:text-fg-subdued hover:border-fg-subdued focus:border-primary-text focus:ring-0 focus:outline-none"
					/>
					<p class="text-[10px] text-fg-subdued">Leave empty for no limit</p>
				</div>

				{#if form?.financeMessage}
					<p class="text-xs {form.financeMessage.ok ? 'text-success' : 'text-error'}">
						{form.financeMessage.text}
					</p>
				{/if}

				<Button type="submit">Save Finance Settings</Button>
			</form>
		</div>
	</div>

	<!-- Invoicing & Business Identity -->
	<div class="mt-6 rounded-xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border/80 px-6 py-4">
			<h2 class="text-sm font-semibold tracking-tight text-fg">Invoicing & Business Identity</h2>
			<p class="mt-0.5 text-xs text-fg-subdued">
				Information displayed on client invoices and fiscal compliance documents (NIF, ANAE, RC,
				etc.).
			</p>
		</div>
		<div class="space-y-6 px-6 py-5">
			<form method="post" action="?/updateInvoicingProfile" use:enhance class="space-y-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Brand / Company Name"
						type="text"
						id="brandName"
						name="brandName"
						bind:value={brandName}
						placeholder="e.g. MegaOrganize Studio"
					/>
					<Input
						label="Tagline / Main Activity"
						type="text"
						id="brandTagline"
						name="brandTagline"
						bind:value={brandTagline}
						placeholder="e.g. Software & Automation Engineering"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Business Address"
						type="text"
						id="address"
						name="address"
						bind:value={address}
						placeholder="e.g. Cité 5 Juillet, Bab Ezzouar 16042, Algiers"
					/>
					<Input
						label="Phone Number"
						type="text"
						id="phone"
						name="phone"
						bind:value={phone}
						placeholder="e.g. +213 553 09 12 35"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Input
						label="Tax ID (NIF)"
						type="text"
						id="nif"
						name="nif"
						bind:value={nif}
						placeholder="e.g. 19816170319014941680"
					/>
					<Input
						label="Sole Proprietor ID (ANAE)"
						type="text"
						id="anae"
						name="anae"
						bind:value={anae}
						placeholder="e.g. 15199589"
					/>
					<Input
						label="Trade Register (RC)"
						type="text"
						id="rc"
						name="rc"
						bind:value={rc}
						placeholder="Optional"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Statistical ID (NIS)"
						type="text"
						id="nis"
						name="nis"
						bind:value={nis}
						placeholder="Optional"
					/>
					<Input
						label="Tax Assessment Article (AI)"
						type="text"
						id="ai"
						name="ai"
						bind:value={ai}
						placeholder="Optional"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Bank / Postal Account RIB"
						type="text"
						id="rib"
						name="rib"
						bind:value={rib}
						placeholder="e.g. 007 99999 0001234567 89"
					/>
				</div>

				{#if form?.invoicingMessage}
					<p class="text-xs {form.invoicingMessage.ok ? 'text-success' : 'text-error'}">
						{form.invoicingMessage.text}
					</p>
				{/if}

				<Button type="submit">Save Invoicing Details</Button>
			</form>

			<div class="my-4 border-t border-border/50 pt-4">
				<h3 class="mb-3 text-xs font-semibold text-fg">Signature & Official Stamp</h3>
				<p class="mb-4 text-xs text-fg-subdued">
					Upload your digital signature and company stamp to automatically affix them to generated
					invoices.
				</p>

				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<!-- Signature Upload -->
					<div class="rounded-xl border border-border bg-bg p-4">
						<span class="text-xs font-semibold text-fg">Digital Signature</span>
						<div
							class="mt-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface"
						>
							{#if data.invoicingProfile?.signatureUrl}
								<img
									src={data.invoicingProfile.signatureUrl}
									alt="Signature"
									class="max-h-24 max-w-full object-contain"
								/>
							{:else}
								<span class="text-xs text-fg-subdued">No signature uploaded</span>
							{/if}
						</div>
						<form
							method="post"
							action="?/uploadMedia"
							enctype="multipart/form-data"
							class="mt-3 flex items-center gap-2"
						>
							<input type="hidden" name="type" value="signature" />
							<input
								type="file"
								name="file"
								accept="image/*"
								required
								class="block w-full text-xs text-fg-subdued file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-hover"
							/>
							<Button size="sm" type="submit">Upload</Button>
						</form>
					</div>

					<!-- Stamp Upload -->
					<div class="rounded-xl border border-border bg-bg p-4">
						<span class="text-xs font-semibold text-fg">Official Stamp</span>
						<div
							class="mt-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface"
						>
							{#if data.invoicingProfile?.stampUrl}
								<img
									src={data.invoicingProfile.stampUrl}
									alt="Stamp"
									class="max-h-24 max-w-full object-contain"
								/>
							{:else}
								<span class="text-xs text-fg-subdued">No stamp uploaded</span>
							{/if}
						</div>
						<form
							method="post"
							action="?/uploadMedia"
							enctype="multipart/form-data"
							class="mt-3 flex items-center gap-2"
						>
							<input type="hidden" name="type" value="stamp" />
							<input
								type="file"
								name="file"
								accept="image/*"
								required
								class="block w-full text-xs text-fg-subdued file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-hover"
							/>
							<Button size="sm" type="submit">Upload</Button>
						</form>
					</div>
				</div>

				{#if form?.mediaMessage}
					<p class="mt-3 text-xs {form.mediaMessage.ok ? 'text-success' : 'text-error'}">
						{form.mediaMessage.text}
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- AI Access -->
	<div class="mt-6 rounded-xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border/80 px-6 py-4">
			<h2 class="text-sm font-semibold tracking-tight text-fg">AI Access (MCP)</h2>
		</div>
		<div class="space-y-4 px-6 py-5">
			<p class="text-xs text-fg-subdued">
				Connect an AI client to your account with the Model Context Protocol. Access is limited to
				your own data: the client can read your content and edit existing items and pages.
			</p>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold tracking-wide text-fg-accent">Endpoint</span>
				<code class="rounded-sm border border-border bg-bg px-3 py-2 text-xs text-fg"
					>{data.mcpUrl}</code
				>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-semibold tracking-wide text-fg-accent">opencode config</span>
					<Button variant="ghost" size="sm" type="button" onclick={copySnippet}>
						<i class="fas {copied ? 'fa-check' : 'fa-copy'} text-xs"></i>
						{copied ? 'Copied' : 'Copy'}
					</Button>
				</div>
				<pre
					class="overflow-x-auto rounded-sm border border-border bg-bg px-3 py-2 text-[11px] leading-relaxed text-fg-subdued"><code
						>{mcpSnippet}</code
					></pre>
			</div>

			<p class="text-[10px] text-fg-subdued">
				The client sends your account email and password on every request, so it stores them in its
				config file. Changing your password revokes access everywhere.
			</p>
		</div>
	</div>
</div>
