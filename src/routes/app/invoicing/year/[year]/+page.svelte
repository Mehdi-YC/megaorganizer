<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
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
		for (const inv of data.invoices) {
			if (inv.status !== 'cancelled') total += inv.total;
			if (inv.status === 'paid') totalPaid += inv.total;
		}
		return { total, totalPaid };
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

	function getStatusBadge(status: string) {
		switch (status) {
			case 'paid':
				return { label: 'Payée', variant: 'success' as const };
			case 'sent':
				return { label: 'Envoyée', variant: 'warning' as const };
			case 'cancelled':
				return { label: 'Annulée', variant: 'danger' as const };
			default:
				return { label: 'Brouillon', variant: 'default' as const };
		}
	}
</script>

<svelte:head>
	<title>Exercice {data.year} - Facturation</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-4 sm:p-8">
	<div class="mb-6">
		<a
			href={resolve('/app/invoicing')}
			class="text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left mr-1"></i> Retour à la facturation
		</a>
	</div>

	<PageHeader
		title="Dossier Fiscal : Exercice {data.year}"
		subtitle="Factures, déclarations annuelles G12 / G12 bis et exportations"
	>
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="secondary" size="sm" onclick={exportFolder} disabled={isExporting}>
				<i class="fas fa-folder-arrow-down mr-1.5 text-xs text-primary-text"></i>
				Exporter le dossier {data.year} (G12 + Factures)
			</Button>

			{#if selectedInvoiceIds.length > 0}
				<Button size="sm" onclick={exportSelectedInvoices} disabled={isExporting}>
					<i class="fas fa-file-zipper mr-1.5 text-xs"></i>
					Exporter la sélection ({selectedInvoiceIds.length})
				</Button>
			{/if}

			<a href={resolve('/app/invoicing/new')}>
				<Button size="sm">
					<i class="fas fa-plus mr-1.5 text-xs"></i> Nouvelle Facture
				</Button>
			</a>
		</div>
	</PageHeader>

	<!-- Summary stats -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-sm border border-border bg-surface p-4">
			<span class="text-xs font-medium text-fg-subdued uppercase">Nombre de factures</span>
			<div class="mt-1 text-lg font-bold text-fg">{data.invoices.length}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<span class="text-xs font-medium text-fg-subdued uppercase">Total Exercice {data.year}</span>
			<div class="mt-1 text-lg font-bold text-fg">{formatDZD(stats().total)}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<span class="text-xs font-medium text-fg-subdued uppercase">Total Encaissé</span>
			<div class="mt-1 text-lg font-bold text-success">{formatDZD(stats().totalPaid)}</div>
		</div>
	</div>

	<!-- Declarations G12 & G12 Bis Cards -->
	<div class="mb-8">
		<h2 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
			Déclarations Fiscales de l'Exercice {data.year}
		</h2>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- G12 Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary-subdued text-primary-text"
						>
							<i class="fas fa-file-shield text-sm"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Déclaration G12</h3>
							<p class="text-[11px] text-fg-subdued">
								Déclaration annuelle de l'impôt forfaitaire unique (IFU)
							</p>
						</div>
					</div>
					{#if data.g12Doc}
						<Badge variant="success">Téléversé</Badge>
					{:else}
						<Badge variant="default">Non renseigné</Badge>
					{/if}
				</div>

				<div class="mt-4 rounded-sm border border-border/80 bg-bg p-3">
					{#if data.g12Doc}
						{@const doc = data.g12Doc}
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									target="_blank"
									class="truncate text-xs font-medium text-primary-text hover:underline"
								>
									<i class="fas fa-file-pdf mr-1 text-xs"></i>
									{doc.originalName}
								</a>
								<div class="text-[10px] text-fg-subdued">
									{(doc.size / 1024).toFixed(1)} Ko • Ajouté le {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-fg"
									title="Télécharger"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-error"
									title="Supprimer"
									onclick={() => handleDeleteDoc(doc.id, 'Déclaration G12')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center">
							<p class="text-xs text-fg-subdued">Aucun document G12 pour {data.year}</p>
						</div>
					{/if}
				</div>

				<div class="mt-3 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-muted"
						>
							<i class="fas fa-upload text-xs"></i>
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
						<span class="text-xs text-fg-subdued"
							><i class="fas fa-spinner fa-spin mr-1"></i> Envoi...</span
						>
					{/if}
				</div>
			</div>

			<!-- G12 Bis Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary-subdued text-primary-text"
						>
							<i class="fas fa-file-invoice text-sm"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Déclaration G12 Bis</h3>
							<p class="text-[11px] text-fg-subdued">
								Déclaration définitive du chiffre d'affaires annuel
							</p>
						</div>
					</div>
					{#if data.g12BisDoc}
						<Badge variant="success">Téléversé</Badge>
					{:else}
						<Badge variant="default">Non renseigné</Badge>
					{/if}
				</div>

				<div class="mt-4 rounded-sm border border-border/80 bg-bg p-3">
					{#if data.g12BisDoc}
						{@const doc = data.g12BisDoc}
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									target="_blank"
									class="truncate text-xs font-medium text-primary-text hover:underline"
								>
									<i class="fas fa-file-pdf mr-1 text-xs"></i>
									{doc.originalName}
								</a>
								<div class="text-[10px] text-fg-subdued">
									{(doc.size / 1024).toFixed(1)} Ko • Ajouté le {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-fg"
									title="Télécharger"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-error"
									title="Supprimer"
									onclick={() => handleDeleteDoc(doc.id, 'Déclaration G12 Bis')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center">
							<p class="text-xs text-fg-subdued">Aucun document G12 Bis pour {data.year}</p>
						</div>
					{/if}
				</div>

				<div class="mt-3 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-muted"
						>
							<i class="fas fa-upload text-xs"></i>
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
						<span class="text-xs text-fg-subdued"
							><i class="fas fa-spinner fa-spin mr-1"></i> Envoi...</span
						>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Invoices list for this year -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
				Factures de l'Exercice {data.year} ({data.invoices.length})
			</h2>
			{#if selectedInvoiceIds.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs text-fg-subdued">{selectedInvoiceIds.length} sélectionnée(s)</span>
					<Button
						size="sm"
						variant="secondary"
						onclick={exportSelectedInvoices}
						disabled={isExporting}
					>
						<i class="fas fa-download mr-1.5 text-xs"></i> Exporter la sélection
					</Button>
				</div>
			{/if}
		</div>

		{#if data.invoices.length > 0}
			<div class="overflow-x-auto rounded-sm border border-border bg-surface">
				<table class="w-full border-collapse text-left text-xs">
					<thead>
						<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
							<th class="w-8 px-3 py-2.5 text-center">
								<input
									type="checkbox"
									checked={selectedInvoiceIds.length > 0 &&
										selectedInvoiceIds.length === data.invoices.length}
									onchange={toggleSelectAll}
									class="rounded-sm border-border"
								/>
							</th>
							<th class="px-3 py-2.5 font-semibold">Numéro</th>
							<th class="px-3 py-2.5 font-semibold">Client</th>
							<th class="px-3 py-2.5 font-semibold">Date</th>
							<th class="px-3 py-2.5 font-semibold">Échéance</th>
							<th class="px-3 py-2.5 text-right font-semibold">Montant TTC</th>
							<th class="px-3 py-2.5 text-center font-semibold">Statut</th>
							<th class="px-3 py-2.5 text-right font-semibold">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.invoices as inv (inv.id)}
							{@const badge = getStatusBadge(inv.status)}
							<tr class="transition-colors hover:bg-muted/50">
								<td class="w-8 px-3 py-3 text-center">
									<input
										type="checkbox"
										checked={selectedInvoiceIds.includes(inv.id)}
										onchange={() => toggleSelect(inv.id)}
										class="rounded-sm border-border"
									/>
								</td>
								<td class="px-3 py-3 font-semibold text-fg-accent">
									<a href={resolve('/app/invoicing/[id]', { id: inv.id })} class="hover:underline">
										{inv.invoiceNumber}
									</a>
								</td>
								<td class="px-3 py-3 font-medium text-fg">
									{inv.client?.name || 'Inconnu'}
								</td>
								<td class="px-3 py-3 text-fg-subdued">
									{formatDateDZ(inv.invoiceDate)}
								</td>
								<td class="px-3 py-3 text-fg-subdued">
									{formatDateDZ(inv.dueDate)}
								</td>
								<td class="px-3 py-3 text-right font-semibold text-fg">
									{formatDZD(inv.total)}
								</td>
								<td class="px-3 py-3 text-center">
									<Badge variant={badge.variant}>{badge.label}</Badge>
								</td>
								<td class="px-3 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<a
											href={resolve('/app/invoicing/[id]', { id: inv.id })}
											title="Consulter"
											class="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
										>
											<i class="fas fa-eye text-xs"></i>
										</a>
										<a
											href={resolve('/app/invoicing/[id]/edit', { id: inv.id })}
											title="Modifier"
											class="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
										>
											<i class="fas fa-pencil text-xs"></i>
										</a>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div
				class="rounded-sm border border-border bg-surface p-8 text-center text-xs text-fg-subdued"
			>
				Aucune facture enregistrée pour l'exercice {data.year}.
			</div>
		{/if}
	</div>
</div>
