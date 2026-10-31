<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
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

		for (const inv of filteredInvoices) {
			if (inv.status !== 'cancelled') {
				totalInvoiced += inv.total;
			}
			if (inv.status === 'paid') {
				totalPaid += inv.total;
			} else if (inv.status === 'sent' || inv.status === 'draft') {
				totalPending += inv.total;
			}
		}

		return { totalInvoiced, totalPaid, totalPending };
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
					exportType: 'invoices',
					invoiceIds: selectedInvoiceIds
				})
			});
			if (!res.ok) throw new Error('Erreur');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `export-factures-${new Date().toISOString().slice(0, 10)}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Exportation téléchargée', 'success');
		} catch {
			showToast("Échec de l'exportation", 'error');
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
	<title>Facturation - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6">
		<PageHeader title="Facturation" subtitle="Gestion conforme aux normes fiscales algériennes">
			<div class="flex flex-wrap items-center gap-2">
				<a href={resolve('/app/invoicing/clients')}>
					<Button variant="secondary" size="sm">
						<i class="fas fa-users mr-1.5 text-xs"></i> Clients
					</Button>
				</a>
				<a href={resolve('/app/invoicing/products')}>
					<Button variant="secondary" size="sm">
						<i class="fas fa-box mr-1.5 text-xs"></i> Produits & Services
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

	<!-- Stats Overview -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase"
					>Total Facturé</span
				>
				<i class="fas fa-file-invoice text-xs text-fg-subdued"></i>
			</div>
			<div class="text-2xl font-semibold text-fg">{formatDZD(stats().totalInvoiced)}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase"
					>Montant Encaissé</span
				>
				<i class="fas fa-circle-check text-xs text-success"></i>
			</div>
			<div class="text-2xl font-semibold text-success">{formatDZD(stats().totalPaid)}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase">En Attente</span>
				<i class="fas fa-clock text-xs text-warning"></i>
			</div>
			<div class="text-2xl font-semibold text-warning">{formatDZD(stats().totalPending)}</div>
		</div>
	</div>

	<!-- Filters & Actions Bar -->
	<div
		class="mb-4 flex flex-col justify-between gap-3 rounded-sm border border-border bg-surface p-3 sm:flex-row sm:items-center"
	>
		<div class="flex flex-wrap items-center gap-3">
			<div class="relative min-w-[220px]">
				<i
					class="fas fa-search pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-fg-subdued"
				></i>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Rechercher numéro, client..."
					class="h-8 w-full rounded-sm border border-border-strong bg-bg pr-3 pl-8 text-xs text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
				/>
			</div>

			<select
				bind:value={selectedYear}
				class="h-8 rounded-sm border border-border-strong bg-bg px-2.5 text-xs text-fg focus:border-primary-text focus:outline-none"
			>
				<option value="all">Toutes les années</option>
				{#each data.years as y (y)}
					<option value={String(y)}>{y}</option>
				{/each}
			</select>

			<select
				bind:value={selectedStatus}
				class="h-8 rounded-sm border border-border-strong bg-bg px-2.5 text-xs text-fg focus:border-primary-text focus:outline-none"
			>
				<option value="all">Tous les statuts</option>
				<option value="draft">Brouillons</option>
				<option value="sent">Envoyées</option>
				<option value="paid">Payées</option>
				<option value="cancelled">Annulées</option>
			</select>
		</div>

		{#if selectedInvoiceIds.length > 0}
			<div class="flex items-center gap-2">
				<span class="text-xs text-fg-subdued">
					{selectedInvoiceIds.length} sélectionnée(s)
				</span>
				<Button size="sm" variant="secondary" onclick={exportSelection}>
					<i class="fas fa-file-zipper mr-1.5 text-xs"></i> Exporter la sélection
				</Button>
			</div>
		{/if}
	</div>

	<!-- Invoices Table -->
	{#if filteredInvoices.length > 0}
		<div class="overflow-x-auto rounded-sm border border-border bg-surface">
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
						<th class="w-8 px-3 py-2.5 text-center">
							<input
								type="checkbox"
								checked={selectedInvoiceIds.length > 0 &&
									selectedInvoiceIds.length === filteredInvoices.length}
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
					{#each filteredInvoices as inv (inv.id)}
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
