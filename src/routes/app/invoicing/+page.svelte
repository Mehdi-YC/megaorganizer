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
			a.download = `factures-selection-${Date.now()}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Export réussi', 'success');
		} catch {
			showToast("Échec de l'export", 'error');
		}
	}

	function getStatusBadge(status: string): {
		variant: 'default' | 'primary' | 'success' | 'warning' | 'danger';
		label: string;
	} {
		switch (status) {
			case 'draft':
				return { variant: 'default', label: 'Brouillon' };
			case 'sent':
				return { variant: 'warning', label: 'Envoyée' };
			case 'paid':
				return { variant: 'success', label: 'Payée' };
			case 'cancelled':
				return { variant: 'danger', label: 'Annulée' };
			default:
				return { variant: 'default', label: status };
		}
	}
</script>

<svelte:head>
	<title>Facturation - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
	<PageHeader
		title="Facturation"
		subtitle="Gestion et suivi conforme aux normes fiscales algériennes"
	>
		<div class="flex flex-wrap items-center gap-2">
			<Button href={resolve('/app/invoicing/clients')} variant="secondary" size="sm">
				<i class="fas fa-users mr-1.5 text-xs"></i> Clients
			</Button>
			<Button href={resolve('/app/invoicing/products')} variant="secondary" size="sm">
				<i class="fas fa-cubes-stacked mr-1.5 text-xs"></i> Services
			</Button>
			<Button href={resolve('/app/invoicing/new')} size="sm">
				<i class="fas fa-plus mr-1.5 text-xs"></i> Nouvelle Facture
			</Button>
		</div>
	</PageHeader>

	<!-- Modern SaaS Stats Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div
			class="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-border-strong"
		>
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Total Facturé</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-fg-subdued">
					<i class="fas fa-file-invoice text-xs"></i>
				</div>
			</div>
			<div class="text-2xl font-bold tracking-tight text-fg">
				{formatDZD(stats().totalInvoiced)}
			</div>
		</div>

		<div
			class="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-border-strong"
		>
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>Montant Encaissé</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
					<i class="fas fa-circle-check text-xs"></i>
				</div>
			</div>
			<div class="text-2xl font-bold tracking-tight text-success">
				{formatDZD(stats().totalPaid)}
			</div>
		</div>

		<div
			class="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-border-strong"
		>
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wider text-fg-subdued uppercase"
					>En Attente</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
					<i class="fas fa-clock text-xs"></i>
				</div>
			</div>
			<div class="text-2xl font-bold tracking-tight text-warning">
				{formatDZD(stats().totalPending)}
			</div>
		</div>
	</div>

	<!-- Filters & Actions Bar -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-col gap-2.5 sm:flex-1 sm:flex-row sm:items-center">
			<div class="relative w-full sm:max-w-xs">
				<i
					class="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-fg-subdued"
				></i>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Rechercher numéro, client..."
					class="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-xs text-fg shadow-xs placeholder:text-fg-subdued/70 focus:border-primary focus:outline-none"
				/>
			</div>

			<div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
				<select
					bind:value={selectedYear}
					class="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-fg shadow-xs focus:border-primary focus:outline-none sm:w-auto"
				>
					<option value="all">Toutes les années</option>
					{#each data.years as y (y)}
						<option value={String(y)}>{y}</option>
					{/each}
				</select>

				<select
					bind:value={selectedStatus}
					class="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-fg shadow-xs focus:border-primary focus:outline-none sm:w-auto"
				>
					<option value="all">Tous les statuts</option>
					<option value="draft">Brouillons</option>
					<option value="sent">Envoyées</option>
					<option value="paid">Payées</option>
					<option value="cancelled">Annulées</option>
				</select>
			</div>
		</div>

		{#if selectedInvoiceIds.length > 0}
			<div class="flex items-center justify-between gap-3 pt-1 sm:justify-end sm:pt-0">
				<span class="text-xs font-medium text-fg-subdued">
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
		<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
			<table class="w-full min-w-[700px] border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-muted/30 text-fg-subdued">
						<th class="w-10 px-3.5 py-3 text-center">
							<input
								type="checkbox"
								checked={selectedInvoiceIds.length > 0 &&
									selectedInvoiceIds.length === filteredInvoices.length}
								onchange={toggleSelectAll}
								class="rounded border-border"
							/>
						</th>
						<th class="px-3.5 py-3 font-semibold">Numéro</th>
						<th class="px-3.5 py-3 font-semibold">Client</th>
						<th class="px-3.5 py-3 font-semibold">Date</th>
						<th class="px-3.5 py-3 font-semibold">Échéance</th>
						<th class="px-3.5 py-3 text-right font-semibold">Montant TTC</th>
						<th class="px-3.5 py-3 text-center font-semibold">Statut</th>
						<th class="px-3.5 py-3 text-right font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each filteredInvoices as inv (inv.id)}
						{@const badge = getStatusBadge(inv.status)}
						<tr class="transition-colors hover:bg-muted/40">
							<td class="w-10 px-3.5 py-3 text-center">
								<input
									type="checkbox"
									checked={selectedInvoiceIds.includes(inv.id)}
									onchange={() => toggleSelect(inv.id)}
									class="rounded border-border"
								/>
							</td>
							<td class="px-3.5 py-3 font-semibold text-fg">
								<a
									href={resolve('/app/invoicing/[id]', { id: inv.id })}
									class="text-primary-text hover:underline"
								>
									{inv.invoiceNumber}
								</a>
							</td>
							<td class="px-3.5 py-3 font-medium text-fg">
								{inv.client?.name || 'Inconnu'}
							</td>
							<td class="px-3.5 py-3 text-fg-subdued">
								{formatDateDZ(inv.invoiceDate)}
							</td>
							<td class="px-3.5 py-3 text-fg-subdued">
								{formatDateDZ(inv.dueDate)}
							</td>
							<td class="px-3.5 py-3 text-right font-semibold text-fg">
								{formatDZD(inv.total)}
							</td>
							<td class="px-3.5 py-3 text-center">
								<Badge variant={badge.variant}>{badge.label}</Badge>
							</td>
							<td class="px-3.5 py-3 text-right">
								<div class="flex items-center justify-end gap-1.5">
									<a
										href={resolve('/app/invoicing/[id]', { id: inv.id })}
										title="Consulter"
										class="flex h-7 w-7 items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
									>
										<i class="fas fa-eye text-xs"></i>
									</a>
									<a
										href={resolve('/app/invoicing/[id]/edit', { id: inv.id })}
										title="Modifier"
										class="flex h-7 w-7 items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
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
