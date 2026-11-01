<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import { enablePush, disablePush } from '$lib/utils/push-client';
	import { themeState } from '$lib/utils/theme.svelte';
	import type { EnabledFeatures } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	const THEME_OPTIONS = [
		{ id: 'light', icon: 'fa-sun', label: 'Light' },
		{ id: 'dark', icon: 'fa-moon', label: 'Dark' },
		{ id: 'system', icon: 'fa-circle-half-stroke', label: 'Auto' }
	] as const;

	// One row per module: the rail is narrow, so the titles carry the meaning
	// and the longer descriptions live in the tooltip.
	const MODULES: readonly {
		name: keyof EnabledFeatures;
		label: string;
		icon: string;
		color: string;
		hint: string;
	}[] = [
		{
			name: 'todos',
			label: 'Tasks',
			icon: 'fa-check-square',
			color: 'bg-indigo-600',
			hint: 'Daily tasks, scheduling and priorities'
		},
		{
			name: 'reminders',
			label: 'Reminders',
			icon: 'fa-bell',
			color: 'bg-amber-600',
			hint: 'Recurring reminders and alert schedules'
		},
		{
			name: 'finance',
			label: 'Finance',
			icon: 'fa-receipt',
			color: 'bg-emerald-600',
			hint: 'Spending logs and monthly budget limit'
		},
		{
			name: 'invoicing',
			label: 'Invoicing',
			icon: 'fa-file-invoice-dollar',
			color: 'bg-teal-600',
			hint: 'Client invoices and annual tax dossiers'
		},
		{
			name: 'training',
			label: 'Training',
			icon: 'fa-person-running',
			color: 'bg-blue-600',
			hint: 'Workout logs, intervals and GPS running'
		},
		{
			name: 'mindmap',
			label: 'Mindmap',
			icon: 'fa-network-wired',
			color: 'bg-purple-600',
			hint: 'Visual network of wiki notes and links'
		},
		{
			name: 'ydk',
			label: 'Yu-Gi-Oh (YDK)',
			icon: 'fa-layer-group',
			color: 'bg-rose-600',
			hint: 'Deck builder and card catalog viewer'
		}
	];
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

<div class="max-w-6xl px-3.5 py-4 sm:p-6 lg:p-8">
	<div class="mb-4">
		<a href={resolve('/app')} class="text-sm text-fg-subdued transition-colors hover:text-fg">
			<i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
		</a>
	</div>

	<PageHeader
		title="Edit Profile"
		subtitle="Account, appearance and workspace preferences."
		descriptionOnHover={false}
	/>

	<!-- Appearance: a compact segmented control instead of three large cards. -->
	<section
		id="appearance"
		class="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xs"
	>
		<div class="min-w-0">
			<h2 class="text-sm font-semibold tracking-tight text-fg">Appearance</h2>
			<p class="text-xs text-fg-subdued">Theme preference for this device.</p>
		</div>
		<div class="inline-flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5">
			{#each THEME_OPTIONS as opt (opt.id)}
				<button
					type="button"
					aria-pressed={themeState.theme === opt.id}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors {themeState.theme ===
					opt.id
						? 'bg-surface font-semibold text-fg shadow-xs'
						: 'text-fg-subdued hover:text-fg'}"
					onclick={() => themeState.setTheme(opt.id)}
				>
					<i class="fas {opt.icon} text-[11px]"></i>
					<span>{opt.label}</span>
				</button>
			{/each}
		</div>
	</section>

	<div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
		<!-- Main column -->
		<div class="space-y-5">
			<section id="profile" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Profile</h2>
				</div>
				<div class="px-5 py-4">
					<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
						<Input label="Name" type="text" id="name" name="name" bind:value={name} required />

						<div class="flex flex-col gap-1.5">
							<label for="email" class="text-xs font-semibold tracking-wide text-fg-accent"
								>Email</label
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
			</section>

			<section id="password" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Change Password</h2>
				</div>
				<div class="px-5 py-4">
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
			</section>

			<section id="finance" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Finance Settings</h2>
				</div>
				<div class="px-5 py-4">
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
			</section>

			<section id="invoicing" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">
						Invoicing & Business Identity
					</h2>
					<p class="mt-0.5 text-xs text-fg-subdued">
						Information displayed on client invoices and fiscal compliance documents (NIF, ANAE, RC,
						etc.).
					</p>
				</div>
				<div class="space-y-5 px-5 py-4">
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

					<div class="border-t border-border/60 pt-4">
						<h3 class="text-xs font-semibold text-fg">Signature & Official Stamp</h3>
						<p class="mt-1 text-xs text-fg-subdued">Affixed automatically to generated invoices.</p>

						<div class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
							<!-- Signature Upload -->
							<div>
								<span class="mb-2.5 block text-xs font-semibold text-fg">Digital Signature</span>
								<div
									class="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20"
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
									use:enhance
									class="mt-3 flex items-center gap-2"
								>
									<input type="hidden" name="type" value="signature" />
									<input
										type="file"
										name="file"
										accept="image/png,image/jpeg,image/webp"
										required
										class="block w-full text-xs text-fg-subdued file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-hover"
									/>
									<Button size="sm" type="submit">Upload</Button>
								</form>
								<p class="mt-1.5 text-[11px] text-fg-subdued">PNG, JPEG or WebP, max 2 MB.</p>
							</div>

							<!-- Stamp Upload -->
							<div>
								<span class="mb-2.5 block text-xs font-semibold text-fg">Official Stamp</span>
								<div
									class="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20"
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
									use:enhance
									class="mt-3 flex items-center gap-2"
								>
									<input type="hidden" name="type" value="stamp" />
									<input
										type="file"
										name="file"
										accept="image/png,image/jpeg,image/webp"
										required
										class="block w-full text-xs text-fg-subdued file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-hover"
									/>
									<Button size="sm" type="submit">Upload</Button>
								</form>
								<p class="mt-1.5 text-[11px] text-fg-subdued">PNG, JPEG or WebP, max 2 MB.</p>
							</div>
						</div>

						{#if form?.mediaMessage}
							<p class="mt-3 text-xs {form.mediaMessage.ok ? 'text-success' : 'text-error'}">
								{form.mediaMessage.text}
							</p>
						{/if}
					</div>
				</div>
			</section>

			<section id="backup" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Backup & Restore</h2>
				</div>
				<div class="space-y-4 px-5 py-4">
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
						Includes all entities and files: knowledge base, attachments, tasks, reminders,
						expenses, invoicing, tax documents (G12/G12 bis), GPS workouts, roadmaps, tier lists,
						YDK decks, and timers.
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
			</section>

			<section id="ai-access" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-5 py-3.5">
					<h2 class="text-sm font-semibold tracking-tight text-fg">AI Access (MCP)</h2>
				</div>
				<div class="space-y-4 px-5 py-4">
					<p class="text-xs text-fg-subdued">
						Connect an AI client to your account with the Model Context Protocol. Access is limited
						to your own data: the client can read your content and edit existing items and pages.
					</p>

					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-semibold tracking-wide text-fg-accent">Endpoint</span>
						<code class="rounded-sm border border-border bg-bg px-3 py-2 text-xs text-fg"
							>{data.mcpUrl}</code
						>
					</div>

					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-semibold tracking-wide text-fg-accent">opencode config</span
							>
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
						The client sends your account email and password on every request, so it stores them in
						its config file. Changing your password revokes access everywhere.
					</p>
				</div>
			</section>
		</div>

		<!-- Right rail: workspace-level preferences, kept in view while scrolling -->
		<div class="space-y-5 lg:sticky lg:top-4">
			<section id="modules" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-4 py-3">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Modules</h2>
					<p class="mt-0.5 text-[11px] text-fg-subdued">
						Disabled modules disappear from navigation and the dashboard.
					</p>
				</div>
				<form
					method="post"
					action="?/updateFeatures"
					use:enhance={() =>
						async ({ update }) => {
							// Enhanced submit keeps the URL clean (no ?/updateFeatures) and
							// avoids a full document reload. update() refreshes all data on
							// success, so the sidebar and dashboard drop the modules that
							// were just disabled.
							await update();
						}}
					class="px-2 py-2"
				>
					<div class="space-y-0.5">
						{#each MODULES as mod (mod.name)}
							<label
								class="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
								title={mod.hint}
							>
								<div class="flex min-w-0 items-center gap-2.5">
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md {mod.color} text-white"
									>
										<i class="fas {mod.icon} text-[11px]"></i>
									</div>
									<span class="truncate text-xs font-medium text-fg">{mod.label}</span>
								</div>
								<input
									type="checkbox"
									name={mod.name}
									checked={data.enabledFeatures?.[mod.name] ?? true}
									class="peer sr-only"
								/>
								<div
									class="relative h-5 w-9 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-primary"
								>
									<span
										class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4"
									></span>
								</div>
							</label>
						{/each}
					</div>

					<div
						class="mt-2 flex items-center justify-between gap-2 border-t border-border/60 px-2 pt-2"
					>
						<Button size="sm" type="submit">Save</Button>
						{#if form?.featuresMessage}
							<span class="text-[11px] {form.featuresMessage.ok ? 'text-success' : 'text-error'}">
								{form.featuresMessage.text}
							</span>
						{/if}
					</div>
				</form>
			</section>

			<section id="push" class="rounded-xl border border-border bg-surface shadow-xs">
				<div class="border-b border-border px-4 py-3">
					<h2 class="text-sm font-semibold tracking-tight text-fg">Push Notifications</h2>
				</div>
				<div class="space-y-3 px-4 py-3.5">
					<p class="text-xs text-fg-subdued">
						Reminder notifications on this device, even when the app is closed.
					</p>
					{#if !pushSupported}
						<p class="text-xs text-fg-subdued">This browser does not support push notifications.</p>
					{:else if !pushConfigured}
						<p class="text-xs text-fg-subdued">
							Push is not configured on the server (missing VAPID keys).
						</p>
					{:else}
						<div class="flex flex-wrap items-center gap-3">
							<Button
								type="button"
								size="sm"
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
			</section>
		</div>
	</div>
</div>
