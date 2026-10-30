<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { formatDZD, formatDateDZ } from '$lib/utils/invoice';
	import type { InvoiceWithDetails } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedInvoiceIds = $state<string[]>([]);
	let isUploadingG12 = $state(false);
	let isUploadingG12Bis = $state(false);
	let isExporting = $state(false);

	const stats = $derived(() => {
		let total = 0;
		let totalPaid = 0;
		let paidCount = 0;
		for (const inv of data.invoices) {
			if (inv.status !== 'cancelled') total += inv.total;
			if (inv.status === 'paid') {
				totalPaid += inv.total;
				paidCount++;
			}
		}
		return { total, totalPaid, paidCount, count: data.invoices.length };
	});

	function toggleSelectAll() {
		if (selectedInvoiceIds.length === data.invoices.length) {
			selectedInvoiceIds = [];
		} else {
			selectedInvoiceIds = data.invoices.map((inv: InvoiceWithDetails) => inv.id);
		}
	}

	function toggleSelect(id: string) {
		if (selectedInvoiceIds.includes(id)) {
			selectedInvoiceIds = selectedInvoiceIds.filter((i) => i !== id);
		} else {
			selectedInvoiceIds = [...selectedInvoiceIds, id];
		}
	}

	async function handleUploadDoc(docType: 'g12' | 'g12_bis', event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (docType === 'g12') isUploadingG12 = true;
		else isUploadingG12Bis = true;

		try {
			const formData = new FormData();
			formData.append('year', String(data.year));
			formData.append('docType', docType);
			formData.append('file', file);

			const res = await fetch('/api/invoicing/yearly-docs', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) throw new Error('Erreur lors du téléversement');
			showToast(`Déclaration ${docType.toUpperCase().replace('_', ' ')} enregistrée`, 'success');
			await invalidateAll();
		} catch {
			showToast('Échec du téléversement', 'error');
		} finally {
			if (docType === 'g12') isUploadingG12 = false;
			else isUploadingG12Bis = false;
			input.value = '';
		}
	}

	async function handleDeleteDoc(docId: string, label: string) {
		try {
			const res = await fetch(`/api/invoicing/yearly-docs?id=${docId}`, {
				method: 'DELETE'
			});
			if (!res.ok) throw new Error('Erreur');
			showToast(`${label} supprimée`, 'success');
			await invalidateAll();
		} catch {
			showToast('Erreur suppression document', 'error');
		}
	}

	async function exportFolder() {
		isExporting = true;
		try {
			const res = await fetch('/api/invoicing/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exportType: 'year',
					year: data.year
				})
			});

			if (!res.ok) throw new Error('Erreur export');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `dossier-fiscal-${data.year}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(`Dossier ${data.year} exporté avec succès`, 'success');
		} catch {
			showToast("Échec de l'exportation du dossier", 'error');
		} finally {
			isExporting = false;
		}
	}

	async function exportSelectedInvoices() {
		if (selectedInvoiceIds.length === 0) return;
		isExporting = true;
		try {
			const res = await fetch('/api/invoicing/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exportType: 'invoices',
					invoiceIds: selectedInvoiceIds
				})
			});

			if (!res.ok) throw new Error('Erreur export');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `factures-${data.year}-selection.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Factures exportées avec succès', 'success');
		} catch {
			showToast("Échec de l'exportation", 'error');
		} finally {
			isExporting = false;
		}
	}

	function getClientInitials(name?: string | null): string {
		if (!name) return '??';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
</script>

<svelte:head>
	<title>Dossier {data.year} - Facturation</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-4 sm:p-8">
	<!-- Back navigation -->
	<div class="mb-5">
		<a
			href={resolve('/app/invoicing')}
			class="inline-flex items-center gap-1.5 text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left text-[11px]"></i>
			<span>Retour à la facturation</span>
		</a>
	</div>

	<!-- Page Header -->
	<div class="mb-6">
		<PageHeader
			title="Dossier Fiscal : Exercice {data.year}"
			subtitle="Factures, déclarations annuelles G12 / G12 bis et exportations"
		>
			<div class="flex flex-wrap items-center gap-2.5">
				<Button variant="secondary" size="sm" onclick={exportFolder} disabled={isExporting}>
					<i class="fas fa-folder-arrow-down mr-1.5 text-xs text-primary-text"></i>
					Exporter le dossier {data.year} (ZIP)
				</Button>

				{#if selectedInvoiceIds.length > 0}
					<Button size="sm" onclick={exportSelectedInvoices} disabled={isExporting}>
						<i class="fas fa-file-zipper mr-1.5 text-xs"></i>
						Exporter ({selectedInvoiceIds.length})
					</Button>
				{/if}

				<a href={resolve('/app/invoicing/new')}>
					<Button size="sm">
						<i class="fas fa-plus mr-1.5 text-xs"></i> Nouvelle Facture
					</Button>
				</a>
			</div>
		</PageHeader>
	</div>

	<!-- Summary stats -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-primary-text/40"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Factures {data.year}</span
				>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subdued/80 text-primary-text"
				>
					<i class="fas fa-receipt text-sm"></i>
				</div>
			</div>
			<div class="mt-2 text-2xl font-bold tracking-tight text-fg">
				{stats().count}
			</div>
			<div class="mt-2 text-xs text-fg-subdued">
				{stats().paidCount} soldée(s) sur l'exercice
			</div>
		</div>

		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-primary-text/40"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Total Exercice {data.year}</span
				>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subdued/80 text-primary-text"
				>
					<i class="fas fa-file-invoice-dollar text-sm"></i>
				</div>
			</div>
			<div class="mt-2 text-2xl font-bold tracking-tight text-fg">
				{formatDZD(stats().total)}
			</div>
			<div class="mt-2 text-xs text-fg-subdued">Chiffre d'affaires facturé</div>
		</div>

		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-emerald-500/40"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Total Encaissé</span
				>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
				>
					<i class="fas fa-circle-check text-sm"></i>
				</div>
			</div>
			<div class="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
				{formatDZD(stats().totalPaid)}
			</div>
			<div class="mt-2 text-xs text-fg-subdued">Règlements perçus</div>
		</div>
	</div>

	<!-- Declarations G12 & G12 Bis Cards -->
	<div class="mb-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-xs font-bold tracking-wider text-fg-subdued uppercase">
				Déclarations Fiscales ({data.year})
			</h2>
			<span class="text-[11px] text-fg-subdued">Obligations fiscales annuelles algériennes</span>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- G12 Card -->
			<div
				class="relative rounded-xl border border-border/80 bg-surface/90 p-5 shadow-xs transition-all hover:border-primary-text/30"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"
						>
							<i class="fas fa-file-shield text-base"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Déclaration G12</h3>
							<p class="text-[11px] text-fg-subdued">
								Déclaration prévisionnelle / existence annuelle
							</p>
						</div>
					</div>
					{#if data.g12Doc}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
						>
							<span class="h-1 w-1 rounded-full bg-emerald-400"></span>
							Déposé
						</span>
					{:else}
						<span
							class="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-fg-subdued"
						>
							Non renseigné
						</span>
					{/if}
				</div>

				<div class="mt-4 rounded-lg border border-border/70 bg-bg/80 p-3">
					{#if data.g12Doc}
						{@const doc = data.g12Doc}
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									target="_blank"
									class="flex items-center gap-1.5 truncate text-xs font-semibold text-primary-text hover:underline"
								>
									<i class="fas fa-file-pdf text-xs"></i>
									<span class="truncate">{doc.originalName}</span>
								</a>
								<div class="mt-0.5 text-[10px] text-fg-subdued">
									{(doc.size / 1024).toFixed(1)} Ko • Ajouté le {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
									title="Télécharger"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-rose-400"
									title="Supprimer"
									onclick={() => handleDeleteDoc(doc.id, 'Déclaration G12')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center text-xs text-fg-subdued">
							<i class="fas fa-cloud-arrow-up mb-1 text-sm text-fg-subdued/60"></i>
							<div>Aucun document G12 pour l'exercice {data.year}</div>
						</div>
					{/if}
				</div>

				<div class="mt-4 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-primary-text/40 hover:bg-muted"
						>
							<i class="fas fa-upload text-xs text-primary-text"></i>
							{data.g12Doc ? 'Remplacer le document G12' : 'Téléverser le G12'}
						</span>
						<input
							type="file"
							accept=".pdf,image/*"
							class="hidden"
							onchange={(e) => handleUploadDoc('g12', e)}
						/>
					</label>
					{#if isUploadingG12}
						<span class="text-xs text-primary-text"
							><i class="fas fa-spinner fa-spin mr-1"></i> Téléversement...</span
						>
					{/if}
				</div>
			</div>

			<!-- G12 Bis Card -->
			<div
				class="relative rounded-xl border border-border/80 bg-surface/90 p-5 shadow-xs transition-all hover:border-primary-text/30"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400"
						>
							<i class="fas fa-file-invoice text-base"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Déclaration G12 Bis</h3>
							<p class="text-[11px] text-fg-subdued">
								Déclaration définitive du chiffre d'affaires annuel
							</p>
						</div>
					</div>
					{#if data.g12BisDoc}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
						>
							<span class="h-1 w-1 rounded-full bg-emerald-400"></span>
							Déposé
						</span>
					{:else}
						<span
							class="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-fg-subdued"
						>
							Non renseigné
						</span>
					{/if}
				</div>

				<div class="mt-4 rounded-lg border border-border/70 bg-bg/80 p-3">
					{#if data.g12BisDoc}
						{@const doc = data.g12BisDoc}
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									target="_blank"
									class="flex items-center gap-1.5 truncate text-xs font-semibold text-primary-text hover:underline"
								>
									<i class="fas fa-file-pdf text-xs"></i>
									<span class="truncate">{doc.originalName}</span>
								</a>
								<div class="mt-0.5 text-[10px] text-fg-subdued">
									{(doc.size / 1024).toFixed(1)} Ko • Ajouté le {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
									title="Télécharger"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-rose-400"
									title="Supprimer"
									onclick={() => handleDeleteDoc(doc.id, 'Déclaration G12 Bis')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center text-xs text-fg-subdued">
							<i class="fas fa-cloud-arrow-up mb-1 text-sm text-fg-subdued/60"></i>
							<div>Aucun document G12 Bis pour l'exercice {data.year}</div>
						</div>
					{/if}
				</div>

				<div class="mt-4 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-primary-text/40 hover:bg-muted"
						>
							<i class="fas fa-upload text-xs text-primary-text"></i>
							{data.g12BisDoc ? 'Remplacer le document G12 Bis' : 'Téléverser le G12 Bis'}
						</span>
						<input
							type="file"
							accept=".pdf,image/*"
							class="hidden"
							onchange={(e) => handleUploadDoc('g12_bis', e)}
						/>
					</label>
					{#if isUploadingG12Bis}
						<span class="text-xs text-primary-text"
							><i class="fas fa-spinner fa-spin mr-1"></i> Téléversement...</span
						>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Invoices in this Folder -->
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xs font-bold tracking-wider text-fg-subdued uppercase">
			Factures de l'Exercice {data.year} ({data.invoices.length})
		</h2>

		{#if selectedInvoiceIds.length > 0}
			<Button size="sm" variant="secondary" onclick={exportSelectedInvoices}>
				<i class="fas fa-file-zipper mr-1.5 text-xs text-primary-text"></i>
				Exporter la sélection ({selectedInvoiceIds.length})
			</Button>
		{/if}
	</div>

	{#if data.invoices.length > 0}
		<div class="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left text-xs">
					<thead>
						<tr class="border-b border-border/70 bg-bg-subdued/70 text-fg-subdued">
							<th class="w-10 px-3.5 py-3 text-center">
								<input
									type="checkbox"
									checked={selectedInvoiceIds.length > 0 &&
										selectedInvoiceIds.length === data.invoices.length}
									onchange={toggleSelectAll}
									class="rounded border-border"
								/>
							</th>
							<th class="px-4 py-3 font-semibold">Numéro</th>
							<th class="px-4 py-3 font-semibold">Client</th>
							<th class="px-4 py-3 font-semibold">Date</th>
							<th class="px-4 py-3 font-semibold">Échéance</th>
							<th class="px-4 py-3 text-right font-semibold">Montant TTC</th>
							<th class="px-4 py-3 text-center font-semibold">Statut</th>
							<th class="px-4 py-3 text-right font-semibold">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each data.invoices as inv (inv.id)}
							<tr class="transition-colors hover:bg-muted/40">
								<td class="w-10 px-3.5 py-3.5 text-center">
									<input
										type="checkbox"
										checked={selectedInvoiceIds.includes(inv.id)}
										onchange={() => toggleSelect(inv.id)}
										class="rounded border-border"
									/>
								</td>
								<td class="px-4 py-3.5">
									<a
										href={resolve('/app/invoicing/[id]', { id: inv.id })}
										class="font-mono text-xs font-semibold text-primary-text hover:underline"
									>
										{inv.invoiceNumber}
									</a>
								</td>
								<td class="px-4 py-3.5">
									<div class="flex items-center gap-2.5">
										<div
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subdued text-[11px] font-bold text-primary-text"
										>
											{getClientInitials(inv.client?.name)}
										</div>
										<span class="truncate font-medium text-fg">{inv.client?.name}</span>
									</div>
								</td>
								<td class="px-4 py-3.5 text-fg-subdued">{formatDateDZ(inv.invoiceDate)}</td>
								<td class="px-4 py-3.5 text-fg-subdued">{formatDateDZ(inv.dueDate)}</td>
								<td class="px-4 py-3.5 text-right font-bold text-fg">{formatDZD(inv.total)}</td>
								<td class="px-4 py-3.5 text-center">
									{#if inv.status === 'paid'}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
										>
											<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
											Payée
										</span>
									{:else if inv.status === 'sent'}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400"
										>
											<span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
											Envoyée
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-fg-subdued"
										>
											<span class="h-1.5 w-1.5 rounded-full bg-fg-subdued"></span>
											Brouillon
										</span>
									{/if}
								</td>
								<td class="px-4 py-3.5 text-right">
									<a
										href={resolve('/app/invoicing/[id]', { id: inv.id })}
										class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
										title="Consulter"
									>
										<i class="fas fa-eye text-xs"></i>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-border/80 bg-surface/80 p-8 text-center">
			<i class="fas fa-folder-open mb-2 text-2xl text-fg-subdued/50"></i>
			<p class="text-sm font-medium text-fg">Aucune facture émise en {data.year}</p>
			<p class="mt-1 text-xs text-fg-subdued">
				Créez une facture datée de l'année {data.year} pour qu'elle s'affiche dans ce dossier.
			</p>
			<div class="mt-4">
				<a href={resolve('/app/invoicing/new')}>
					<Button size="sm">
						<i class="fas fa-plus mr-1.5 text-xs"></i> Créer une facture
					</Button>
				</a>
			</div>
		</div>
	{/if}
</div>
