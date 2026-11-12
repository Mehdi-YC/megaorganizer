<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { confirmAction } from '$lib/utils/confirm.svelte';
	import InvoiceDocument from '$lib/components/invoicing/InvoiceDocument.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
			if (!res.ok) return;
			currentStatus = newStatus;
			showToast('Status updated', 'success');
			await invalidateAll();
		} catch {
			showToast('Failed to update status', 'error');
		}
	}

	async function deleteInvoice() {
		if (!(await confirmAction('Delete this invoice?'))) return;
		const res = await fetch(`/api/invoicing/invoices?id=${data.invoice.id}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			showToast('Invoice deleted', 'success');
			goto(resolve('/app/invoicing'));
		}
	}

	let isExportingHtml = $state(false);

	async function downloadSingleHtml() {
		if (isExportingHtml) return;
		isExportingHtml = true;
		try {
			const res = await fetch('/api/invoicing/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exportType: 'single_html',
					invoiceIds: [data.invoice.id]
				})
			});
			if (!res.ok) return;
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `invoice-${data.invoice.invoiceNumber.replace(/\//g, '_')}.html`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Invoice HTML exported', 'success');
		} catch {
			showToast('Export failed', 'error');
		} finally {
			isExportingHtml = false;
		}
	}
</script>

<svelte:head>
	<title>{data.invoice.invoiceNumber} - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-3.5 py-4 sm:p-6 lg:p-8">
	<!-- Actions Bar (hidden on print) -->
	<div
		class="no-print mb-6 flex flex-col justify-between gap-4 rounded-sm border border-border bg-surface p-3.5 sm:flex-row sm:items-center"
	>
		<div class="flex items-center gap-3">
			<a
				href={resolve('/app/invoicing')}
				class="flex h-8 w-8 items-center justify-center rounded-sm text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
				title="Back to invoices"
			>
				<i class="fas fa-arrow-left text-sm"></i>
			</a>
			<div>
				<h1 class="text-sm font-bold text-fg-accent">{data.invoice.invoiceNumber}</h1>
				<span class="text-xs text-fg-subdued">Client: {data.invoice.client.name}</span>
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
				class="h-8 rounded-sm border border-border-strong bg-bg px-2.5 text-xs font-medium text-fg focus:outline-none"
			>
				<option value="draft">Draft</option>
				<option value="sent">Sent</option>
				<option value="paid">Paid</option>
				<option value="cancelled">Cancelled</option>
			</select>

			<a
				href={resolve('/app/invoicing/[id]/print', { id: data.invoice.id })}
				target="_blank"
				rel="noreferrer"
			>
				<Button variant="secondary" size="sm">
					<i class="fas fa-print mr-1.5 text-xs"></i> Print / PDF
				</Button>
			</a>

			<Button variant="secondary" size="sm" onclick={downloadSingleHtml} disabled={isExportingHtml}>
				<i class="fas fa-download mr-1.5 text-xs"></i> Export HTML
			</Button>

			<a href={resolve('/app/invoicing/[id]/edit', { id: data.invoice.id })}>
				<Button variant="secondary" size="sm">
					<i class="fas fa-pencil mr-1.5 text-xs"></i> Edit
				</Button>
			</a>

			<Button variant="danger" size="sm" onclick={deleteInvoice}>
				<i class="fas fa-trash mr-1.5 text-xs"></i> Delete
			</Button>
		</div>
	</div>

	<!-- Printable Invoice Document -->
	<div class="my-4 flex justify-center overflow-x-auto print:m-0 print:overflow-visible print:p-0">
		<InvoiceDocument invoice={data.invoice} profile={data.profile} />
	</div>
</div>
