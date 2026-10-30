<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmButton from '$lib/components/ui/ConfirmButton.svelte';
	import InvoiceDocument from '$lib/components/invoicing/InvoiceDocument.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let confirmDeleteId = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let currentStatus = $state(data.invoice.status);

	async function updateStatus(newStatus: 'draft' | 'sent' | 'paid' | 'cancelled') {
		try {
			const res = await fetch('/api/invoicing/invoices', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: data.invoice.id,
					status: newStatus
				})
			});
			if (!res.ok) throw new Error('Erreur');
			currentStatus = newStatus;
			showToast('Statut mis à jour', 'success');
			await invalidateAll();
		} catch {
			showToast('Erreur mise à jour statut', 'error');
		}
	}

	async function deleteInvoice() {
		const res = await fetch(`/api/invoicing/invoices?id=${data.invoice.id}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			showToast('Facture supprimée', 'success');
			goto(resolve('/app/invoicing'));
		} else {
			showToast('Erreur lors de la suppression', 'error');
		}
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.invoice.invoiceNumber} - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-4 sm:p-8">
	<!-- Actions Bar (hidden on print) -->
	<div
		class="no-print mb-6 flex flex-col justify-between gap-4 rounded-sm border border-border bg-surface p-4 sm:flex-row sm:items-center"
	>
		<div class="flex items-center gap-3">
			<a
				href={resolve('/app/invoicing')}
				class="flex h-8 w-8 items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				title="Retour"
			>
				<i class="fas fa-arrow-left text-sm"></i>
			</a>
			<div>
				<h1 class="text-sm font-bold text-fg-accent">{data.invoice.invoiceNumber}</h1>
				<span class="text-xs text-fg-subdued">Client : {data.invoice.client.name}</span>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Status Dropdown -->
			<select
				value={currentStatus}
				onchange={(e) =>
					updateStatus(
						(e.target as HTMLSelectElement).value as 'draft' | 'sent' | 'paid' | 'cancelled'
					)}
				class="h-8 rounded-sm border border-border bg-bg px-2.5 text-xs font-medium text-fg focus:outline-none"
			>
				<option value="draft">Brouillon</option>
				<option value="sent">Envoyée</option>
				<option value="paid">Payée</option>
				<option value="cancelled">Annulée</option>
			</select>

			<Button variant="secondary" size="sm" onclick={handlePrint}>
				<i class="fas fa-print mr-1.5 text-xs"></i> Imprimer / PDF
			</Button>

			<a href={resolve('/app/invoicing/[id]/edit', { id: data.invoice.id })}>
				<Button variant="secondary" size="sm">
					<i class="fas fa-pencil mr-1.5 text-xs"></i> Modifier
				</Button>
			</a>

			<ConfirmButton
				confirmId={confirmDeleteId ?? ''}
				targetId={data.invoice.id}
				size="sm"
				onconfirm={() => {
					if (confirmDeleteId === data.invoice.id) {
						deleteInvoice();
					} else {
						confirmDeleteId = data.invoice.id;
						setTimeout(() => {
							if (confirmDeleteId === data.invoice.id) confirmDeleteId = null;
						}, 3000);
					}
				}}
			/>
		</div>
	</div>

	<!-- Printable Invoice Document -->
	<InvoiceDocument invoice={data.invoice} profile={data.profile} />
</div>
