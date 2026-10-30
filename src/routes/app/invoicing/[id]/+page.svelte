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

<div class="mx-auto max-w-5xl p-4 sm:p-8">
	<!-- Actions Bar (hidden on print) -->
	<div
		class="no-print mb-6 flex flex-col justify-between gap-4 rounded-xl border border-border/80 bg-surface/90 p-4 shadow-xs sm:flex-row sm:items-center"
	>
		<div class="flex items-center gap-3.5">
			<a
				href={resolve('/app/invoicing')}
				class="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				title="Retour aux factures"
			>
				<i class="fas fa-arrow-left text-xs"></i>
			</a>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-mono text-sm font-bold text-fg">{data.invoice.invoiceNumber}</h1>
					{#if currentStatus === 'paid'}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
						>
							<span class="h-1 w-1 rounded-full bg-emerald-400"></span>
							Payée
						</span>
					{:else if currentStatus === 'sent'}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
						>
							<span class="h-1 w-1 rounded-full bg-amber-400"></span>
							Envoyée
						</span>
					{:else if currentStatus === 'cancelled'}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400"
						>
							<span class="h-1 w-1 rounded-full bg-rose-400"></span>
							Annulée
						</span>
					{:else}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-fg-subdued"
						>
							<span class="h-1 w-1 rounded-full bg-fg-subdued"></span>
							Brouillon
						</span>
					{/if}
				</div>
				<span class="text-xs text-fg-subdued"
					>Client : <strong class="font-medium text-fg">{data.invoice.client.name}</strong></span
				>
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
				class="h-8 rounded-lg border border-border/80 bg-bg px-2.5 text-xs font-medium text-fg transition-colors focus:border-primary-text focus:outline-hidden"
			>
				<option value="draft">Brouillon</option>
				<option value="sent">Envoyée</option>
				<option value="paid">Payée</option>
				<option value="cancelled">Annulée</option>
			</select>

			<Button variant="secondary" size="sm" onclick={handlePrint}>
				<i class="fas fa-print mr-1.5 text-xs text-primary-text"></i> Imprimer / PDF
			</Button>

			<a href={resolve('/app/invoicing/[id]/edit', { id: data.invoice.id })}>
				<Button variant="secondary" size="sm">
					<i class="fas fa-pen mr-1.5 text-xs"></i> Modifier
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

	<!-- Printable Invoice Document Sheet Container -->
	<div class="overflow-hidden rounded-xl border border-border/70 bg-[#0f1117] p-2 shadow-xl sm:p-6">
		<InvoiceDocument invoice={data.invoice} profile={data.profile} />
	</div>
</div>
