<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	// svelte-ignore state_referenced_locally
	let name = $state(data.user?.name ?? '');

	let importStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let importMessage = $state('');
	let importCounts = $state<Record<string, number> | null>(null);
	let importInput = $state<HTMLInputElement | null>(null);

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

<div class="p-4 sm:p-8 max-w-2xl">
	<div class="mb-6">
		<a href="/app" class="text-sm text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
		</a>
	</div>

	<h1 class="text-lg font-semibold text-fg-accent mb-6">Edit Profile</h1>

	<div class="rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Profile</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
				<div class="flex flex-col gap-1.5">
					<label for="name" class="text-xs font-semibold text-fg-accent tracking-wide">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-xs font-semibold text-fg-accent tracking-wide">Email</label>
					<input
						type="email"
						id="email"
						value={data.user?.email}
						disabled
						class="h-[36px] w-full rounded-sm border border-border bg-muted px-3 text-sm text-fg-subdued cursor-not-allowed"
					/>
					<p class="text-[10px] text-fg-subdued">Email cannot be changed</p>
				</div>

				{#if form?.profileMessage}
					<p class="text-xs {form.profileMessage.includes('success') ? 'text-green-600' : 'text-error'}">{form.profileMessage}</p>
				{/if}

				<button
					type="submit"
					class="h-[36px] rounded-sm bg-primary px-6 font-medium text-white text-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
				>
					Save Changes
				</button>
			</form>
		</div>
	</div>

	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Change Password</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/changePassword" use:enhance class="space-y-4">
				<div class="flex flex-col gap-1.5">
					<label for="currentPassword" class="text-xs font-semibold text-fg-accent tracking-wide">Current Password</label>
					<input
						type="password"
						id="currentPassword"
						name="currentPassword"
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="newPassword" class="text-xs font-semibold text-fg-accent tracking-wide">New Password</label>
					<input
						type="password"
						id="newPassword"
						name="newPassword"
						required
						minlength="8"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="confirmPassword" class="text-xs font-semibold text-fg-accent tracking-wide">Confirm New Password</label>
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						required
						minlength="8"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				{#if form?.passwordMessage}
					<p class="text-xs {form.passwordMessage.includes('success') ? 'text-green-600' : 'text-error'}">{form.passwordMessage}</p>
				{/if}

				<button
					type="submit"
					class="h-[36px] rounded-sm bg-primary px-6 font-medium text-white text-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
				>
					Change Password
				</button>
			</form>
		</div>
	</div>

	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Backup & Restore</h2>
		</div>
		<div class="px-6 py-5 space-y-4">
			<p class="text-xs text-fg-subdued">Export all your data as a JSON file, or restore from a previous backup. Existing items with the same name will be skipped.</p>

			<div class="flex flex-col sm:flex-row gap-2">
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center gap-2 rounded-sm bg-primary px-5 font-medium text-white text-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
					onclick={exportBackup}
				>
					<i class="fas fa-download text-xs"></i> Export Backup
				</button>
				<button
					type="button"
					class="inline-flex h-[36px] items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 font-medium text-sm text-fg transition-colors hover:bg-muted active:scale-[0.98]"
					onclick={triggerImport}
				>
					<i class="fas fa-upload text-xs"></i> Import Backup
				</button>
				<input
					type="file"
					accept=".json"
					class="hidden"
					bind:this={importInput}
					onchange={handleImportFile}
				/>
			</div>
			<p class="text-[10px] text-fg-subdued/60">Includes all categories, pages, items, tags, and file attachments.</p>

			{#if importStatus === 'loading'}
				<div class="flex items-center gap-2 text-xs text-fg-subdued">
					<i class="fas fa-spinner fa-spin text-xs"></i> Importing...
				</div>
			{:else if importStatus === 'success'}
				<div class="rounded-sm border border-green-500/30 bg-green-500/10 px-4 py-3">
					<p class="text-xs font-medium text-green-500">{importMessage}</p>
					{#if importCounts}
						<div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-subdued">
							{#if importCounts.categories}<span>{importCounts.categories} categories</span>{/if}
							{#if importCounts.pages}<span>{importCounts.pages} pages</span>{/if}
							{#if importCounts.elements}<span>{importCounts.elements} elements</span>{/if}
							{#if importCounts.tags}<span>{importCounts.tags} tags</span>{/if}
							{#if importCounts.attachments}<span>{importCounts.attachments} files</span>{/if}
							{#if importCounts.skipped}<span class="text-fg-subdued/60">({importCounts.skipped} skipped)</span>{/if}
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
</div>
