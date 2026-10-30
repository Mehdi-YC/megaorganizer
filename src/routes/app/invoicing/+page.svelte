<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ui/ConfirmButton.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { formatDZD, formatDateDZ } from '$lib/utils/invoice';
	import type { InvoiceWithDetails } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	// svelte-ignore state_referenced_locally
	let selectedYear = $state<string>(data.currentYear ? String(data.currentYear) : 'all');
	// svelte-ignore state_referenced_locally
	let selectedStatus = $state<string>(data.currentStatus || 'all');
	let selectedInvoiceIds = $state<string[]>([]);
	let confirmDeleteId = $state<string | null>(null);

	const filteredInvoices = $derived(
		(data.invoices || []).filter((inv: InvoiceWithDetails) => {
			if (selectedYear !== 'all' && inv.year !== parseInt(selectedYear, 10)) {
				return false;
			}
			if (selectedStatus !== 'all' && inv.status !== selectedStatus) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
				const matchClient = inv.client?.name?.toLowerCase().includes(q);
				if (!matchNum && !matchClient) return false;
			}
			return true;
		})
	);

	const stats = $derived(() => {
		let totalInvoiced = 0;
		let totalPaid = 0;
		let totalPending = 0;
		let paidCount = 0;
		let pendingCount = 0;

		for (const inv of filteredInvoices) {
			if (inv.status !== 'cancelled') {
				totalInvoiced += inv.total;
			}
			if (inv.status === 'paid') {
				totalPaid += inv.total;
				paidCount++;
			} else if (inv.status === 'sent' || inv.status === 'draft') {
				totalPending += inv.total;
				pendingCount++;
			}
		}

		return {
			totalInvoiced,
			totalPaid,
			totalPending,
			totalCount: filteredInvoices.length,
			paidCount,
			pendingCount
		};
	});

	function toggleSelectAll() {
		if (selectedInvoiceIds.length === filteredInvoices.length) {
			selectedInvoiceIds = [];
		} else {
			selectedInvoiceIds = filteredInvoices.map((inv: InvoiceWithDetails) => inv.id);
		}
	}

	function toggleSelect(id: string) {
		if (selectedInvoiceIds.includes(id)) {
			selectedInvoiceIds = selectedInvoiceIds.filter((i) => i !== id);
		} else {
			selectedInvoiceIds = [...selectedInvoiceIds, id];
		}
	}

	async function deleteInvoice(id: string) {
		const res = await fetch(`/api/invoicing/invoices?id=${id}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			showToast('Facture supprimée', 'success');
			confirmDeleteId = null;
			await invalidateAll();
		} else {
			showToast('Erreur lors de la suppression', 'error');
		}
	}

	async function exportSelection() {
		if (selectedInvoiceIds.length === 0) return;

		try {
			const res = await fetch('/api/invoicing/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exportType: 'selection',
					invoiceIds: selectedInvoiceIds
				})
			});

			if (!res.ok) throw new Error('Erreur export');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `factures-selection-${Date.now()}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Sélection exportée avec succès', 'success');
		} catch {
			showToast("Échec de l'exportation", 'error');
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
	<title>Facturation - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-4 sm:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<PageHeader title="Facturation" subtitle="Gestion conforme aux normes fiscales algériennes">
			<div class="flex flex-wrap items-center gap-2.5">
				<a href={resolve('/app/invoicing/clients')}>
					<Button variant="secondary" size="sm">
						<i class="fas fa-users mr-1.5 text-xs text-primary-text"></i> Clients
					</Button>
				</a>
				<a href={resolve('/app/invoicing/products')}>
					<Button variant="secondary" size="sm">
						<i class="fas fa-boxes-stacked mr-1.5 text-xs text-primary-text"></i> Produits & Services
					</Button>
				</a>
				<a href={resolve('/app/invoicing/new')}>
					<Button size="sm">
						<i class="fas fa-plus mr-1.5 text-xs"></i> Nouvelle Facture
					</Button>
				</a>
			</div>
		</PageHeader>
	</div>

	<!-- Stats Overview Cards -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Total Facturé -->
		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-primary-text/40 hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Total Facturé</span
				>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subdued/80 text-primary-text"
				>
					<i class="fas fa-file-invoice-dollar text-sm"></i>
				</div>
			</div>
			<div class="mt-2 text-2xl font-bold tracking-tight text-fg">
				{formatDZD(stats().totalInvoiced)}
			</div>
			<div class="mt-2 flex items-center gap-2 text-xs text-fg-subdued">
				<span class="font-medium text-fg">{stats().totalCount}</span> facture(s) enregistrée(s)
			</div>
		</div>

		<!-- Montant Encaissé -->
		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-emerald-500/40 hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Montant Encaissé</span
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
			<div class="mt-2 flex items-center gap-2 text-xs text-fg-subdued">
				<span class="font-medium text-emerald-400">{stats().paidCount}</span> facture(s) soldée(s)
			</div>
		</div>

		<!-- En Attente -->
		<div
			class="relative overflow-hidden rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xs transition-all hover:border-amber-500/40 hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>En Attente</span
				>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"
				>
					<i class="fas fa-clock text-sm"></i>
				</div>
			</div>
			<div class="mt-2 text-2xl font-bold tracking-tight text-amber-400">
				{formatDZD(stats().totalPending)}
			</div>
			<div class="mt-2 flex items-center gap-2 text-xs text-fg-subdued">
				<span class="font-medium text-amber-400">{stats().pendingCount}</span> en cours de règlement
			</div>
		</div>
	</div>

	<!-- Filters & Actions Toolbar -->
	<div
		class="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-border/80 bg-surface/90 p-3.5 sm:flex-row sm:items-center"
	>
		<div class="flex flex-wrap items-center gap-3">
			<!-- Search Bar -->
			<div class="relative min-w-[220px]">
				<i
					class="fas fa-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-xs text-fg-subdued"
				></i>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Rechercher numéro, client..."
					class="h-9 w-full rounded-lg border border-border/80 bg-bg/90 pr-3 pl-8 text-xs text-fg transition-colors placeholder:text-fg-subdued focus:border-primary-text focus:outline-hidden"
				/>
				{#if searchQuery}
					<button
						type="button"
						aria-label="Effacer la recherche"
						class="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-fg-subdued hover:text-fg"
						onclick={() => (searchQuery = '')}
					>
						<i class="fas fa-xmark"></i>
					</button>
				{/if}
			</div>

			<!-- Year Filter -->
			<div class="relative">
				<select
					bind:value={selectedYear}
					class="h-9 rounded-lg border border-border/80 bg-bg/90 px-3 text-xs text-fg transition-colors focus:border-primary-text focus:outline-hidden"
				>
					<option value="all">Toutes les années</option>
					{#each data.years as y (y)}
						<option value={String(y)}>Année {y}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter -->
			<div class="relative">
				<select
					bind:value={selectedStatus}
					class="h-9 rounded-lg border border-border/80 bg-bg/90 px-3 text-xs text-fg transition-colors focus:border-primary-text focus:outline-hidden"
				>
					<option value="all">Tous les statuts</option>
					<option value="draft">Brouillons</option>
					<option value="sent">Envoyées</option>
					<option value="paid">Payées</option>
					<option value="cancelled">Annulées</option>
				</select>
			</div>

			{#if searchQuery || selectedYear !== 'all' || selectedStatus !== 'all'}
				<button
					type="button"
					onclick={() => {
						searchQuery = '';
						selectedYear = 'all';
						selectedStatus = 'all';
					}}
					class="text-xs text-fg-subdued transition-colors hover:text-fg"
				>
					<i class="fas fa-rotate-left mr-1"></i> Réinitialiser
				</button>
			{/if}
		</div>

		{#if selectedInvoiceIds.length > 0}
			<div class="flex items-center gap-3">
				<span class="rounded-md bg-primary-subdued px-2 py-1 text-xs font-medium text-primary-text">
					{selectedInvoiceIds.length} sélectionnée(s)
				</span>
				<Button size="sm" variant="secondary" onclick={exportSelection}>
					<i class="fas fa-file-zipper mr-1.5 text-xs text-primary-text"></i> Exporter la sélection (ZIP)
				</Button>
			</div>
		{/if}
	</div>

	<!-- Invoices Table -->
	{#if filteredInvoices.length > 0}
		<div class="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left text-xs">
					<thead>
						<tr class="border-b border-border/70 bg-bg-subdued/70 text-fg-subdued">
							<th class="w-10 px-3.5 py-3 text-center">
								<input
									type="checkbox"
									checked={selectedInvoiceIds.length > 0 &&
										selectedInvoiceIds.length === filteredInvoices.length}
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
							<th class="px-4 py-3 text-right font-semibold">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each filteredInvoices as inv (inv.id)}
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
										<div class="min-w-0">
											<div class="truncate font-medium text-fg">
												{inv.client?.name || 'Client inconnu'}
											</div>
											{#if inv.client?.city}
												<div class="text-[11px] text-fg-subdued">
													{inv.client.city}, {inv.client.country || 'Algérie'}
												</div>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-4 py-3.5 text-fg-subdued">
									{formatDateDZ(inv.invoiceDate)}
								</td>
								<td class="px-4 py-3.5 text-fg-subdued">
									{formatDateDZ(inv.dueDate)}
								</td>
								<td class="px-4 py-3.5 text-right font-bold text-fg">
									{formatDZD(inv.total)}
								</td>
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
									{:else if inv.status === 'cancelled'}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-400"
										>
											<span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
											Annulée
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
									<div class="flex items-center justify-end gap-1.5">
										<a
											href={resolve('/app/invoicing/[id]', { id: inv.id })}
											title="Consulter"
											class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
										>
											<i class="fas fa-eye text-xs"></i>
										</a>
										<a
											href={resolve('/app/invoicing/[id]/edit', { id: inv.id })}
											title="Modifier"
											class="flex h-7 w-7 items-center justify-center rounded-md text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
										>
											<i class="fas fa-pen text-xs"></i>
										</a>
										<ConfirmButton
											confirmId={confirmDeleteId ?? ''}
											targetId={inv.id}
											size="sm"
											onconfirm={() => {
												if (confirmDeleteId === inv.id) {
													deleteInvoice(inv.id);
												} else {
													confirmDeleteId = inv.id;
													setTimeout(() => {
														if (confirmDeleteId === inv.id) confirmDeleteId = null;
													}, 3000);
												}
											}}
										/>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<EmptyState
			icon="fa-file-invoice-dollar"
			message="Aucune facture trouvée"
			submessage="Créez votre première facture pour commencer votre facturation conforme."
		>
			<a href={resolve('/app/invoicing/new')}>
				<Button size="sm">
					<i class="fas fa-plus mr-1.5 text-xs"></i> Créer une facture
				</Button>
			</a>
		</EmptyState>
	{/if}
</div>
