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

			if (!res.ok) throw new Error('Upload error');
			showToast(`Tax filing ${docType.toUpperCase().replace('_', ' ')} saved`, 'success');
			await invalidateAll();
		} catch {
			showToast('Upload failed', 'error');
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
			if (!res.ok) throw new Error('Error');
			showToast(`${label} deleted`, 'success');
			await invalidateAll();
		} catch {
			showToast('Failed to delete document', 'error');
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

			if (!res.ok) throw new Error('Export error');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `tax-record-${data.year}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(`Year ${data.year} folder exported successfully`, 'success');
		} catch {
			showToast('Failed to export tax folder', 'error');
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

			if (!res.ok) throw new Error('Export error');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `invoices-${data.year}-selection.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast('Invoices exported successfully', 'success');
		} catch {
			showToast('Export failed', 'error');
		} finally {
			isExporting = false;
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'paid':
				return { label: 'Paid', variant: 'success' as const };
			case 'sent':
				return { label: 'Sent', variant: 'warning' as const };
			case 'cancelled':
				return { label: 'Cancelled', variant: 'danger' as const };
			default:
				return { label: 'Draft', variant: 'default' as const };
		}
	}
</script>

<svelte:head>
	<title>Fiscal Year {data.year} - Invoicing</title>
</svelte:head>

<div class="px-3.5 py-4 sm:p-6 lg:p-8">
	<div class="mb-6">
		<a
			href={resolve('/app/invoicing')}
			class="text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left mr-1"></i> Back to invoicing
		</a>
	</div>

	<PageHeader
		title="Tax Record: Fiscal Year {data.year}"
		subtitle="Invoices, annual filings (G12 / G12 bis) and exports"
		descriptionOnHover
	>
		<div class="flex flex-nowrap items-center gap-1.5 sm:gap-2">
			<Button
				variant="secondary"
				size="xs"
				onclick={exportFolder}
				disabled={isExporting}
				class="whitespace-nowrap sm:h-8 sm:px-3 sm:!text-xs"
			>
				<i class="fas fa-folder-arrow-down mr-1 text-[10px] text-primary-text sm:text-xs"></i>
				<span class="hidden sm:inline">Export year {data.year}</span>
				<span class="sm:hidden">Export {data.year}</span>
			</Button>

			{#if selectedInvoiceIds.length > 0}
				<Button
					size="xs"
					onclick={exportSelectedInvoices}
					disabled={isExporting}
					class="whitespace-nowrap sm:h-8 sm:px-3 sm:!text-xs"
				>
					<i class="fas fa-file-zipper mr-1 text-[10px] sm:text-xs"></i>
					<span class="hidden sm:inline">Export selected ({selectedInvoiceIds.length})</span>
					<span class="sm:hidden">Selected ({selectedInvoiceIds.length})</span>
				</Button>
			{/if}

			<a href={resolve('/app/invoicing/new')}>
				<Button size="xs" class="whitespace-nowrap sm:h-8 sm:px-3 sm:!text-xs">
					<i class="fas fa-plus mr-1 text-[10px] sm:text-xs"></i> Invoice
				</Button>
			</a>
		</div>
	</PageHeader>

	<!-- Summary stats -->
	<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase"
					>Number of invoices</span
				>
				<i class="fas fa-file-invoice text-xs text-fg-subdued"></i>
			</div>
			<div class="text-2xl font-semibold text-fg">{data.invoices.length}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase"
					>Total Fiscal Year {data.year}</span
				>
				<i class="fas fa-coins text-xs text-fg-subdued"></i>
			</div>
			<div class="text-2xl font-semibold text-fg">{formatDZD(stats().total)}</div>
		</div>
		<div class="rounded-sm border border-border bg-surface p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-fg-accent uppercase"
					>Total Collected</span
				>
				<i class="fas fa-circle-check text-xs text-success"></i>
			</div>
			<div class="text-2xl font-semibold text-success">{formatDZD(stats().totalPaid)}</div>
		</div>
	</div>

	<!-- Declarations G12 & G12 Bis Cards -->
	<div class="mb-8">
		<h2 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
			Tax Filings for Fiscal Year {data.year}
		</h2>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- G12 Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
						>
							<i class="fas fa-file-shield text-sm"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Declaration G12</h3>
							<p class="text-[11px] text-fg-subdued">
								Annual declaration of single flat-rate tax (IFU)
							</p>
						</div>
					</div>
					{#if data.g12Doc}
						<Badge variant="success">Uploaded</Badge>
					{:else}
						<Badge variant="default">Not filed</Badge>
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
									{(doc.size / 1024).toFixed(1)} KB • Added {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-fg"
									title="Download"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-error"
									title="Delete"
									onclick={() => handleDeleteDoc(doc.id, 'Declaration G12')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center">
							<p class="text-xs text-fg-subdued">No G12 document for {data.year}</p>
						</div>
					{/if}
				</div>

				<div class="mt-3 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-muted"
						>
							<i class="fas fa-upload text-xs"></i>
							{data.g12Doc ? 'Replace G12 document' : 'Upload G12'}
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
							><i class="fas fa-spinner fa-spin mr-1"></i> Uploading...</span
						>
					{/if}
				</div>
			</div>

			<!-- G12 Bis Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs"
						>
							<i class="fas fa-file-invoice text-sm"></i>
						</div>
						<div>
							<h3 class="text-sm font-bold text-fg">Declaration G12 Bis</h3>
							<p class="text-[11px] text-fg-subdued">Final declaration of annual turnover</p>
						</div>
					</div>
					{#if data.g12BisDoc}
						<Badge variant="success">Uploaded</Badge>
					{:else}
						<Badge variant="default">Not filed</Badge>
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
									{(doc.size / 1024).toFixed(1)} KB • Added {formatDateDZ(doc.createdAt || '')}
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<a
									href="/api/invoicing/yearly-docs?id={doc.id}"
									download={doc.originalName}
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-fg"
									title="Download"
								>
									<i class="fas fa-download text-xs"></i>
								</a>
								<button
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-error"
									title="Delete"
									onclick={() => handleDeleteDoc(doc.id, 'Declaration G12 Bis')}
								>
									<i class="fas fa-trash-can text-xs"></i>
								</button>
							</div>
						</div>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						<div class="py-2 text-center">
							<p class="text-xs text-fg-subdued">No G12 Bis document for {data.year}</p>
						</div>
					{/if}
				</div>

				<div class="mt-3 flex items-center justify-between">
					<label class="cursor-pointer">
						<span
							class="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-muted"
						>
							<i class="fas fa-upload text-xs"></i>
							{data.g12BisDoc ? 'Replace G12 Bis document' : 'Upload G12 Bis'}
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
							><i class="fas fa-spinner fa-spin mr-1"></i> Uploading...</span
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
				Invoices for Fiscal Year {data.year} ({data.invoices.length})
			</h2>
			{#if selectedInvoiceIds.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs text-fg-subdued">{selectedInvoiceIds.length} selected</span>
					<Button
						size="sm"
						variant="secondary"
						onclick={exportSelectedInvoices}
						disabled={isExporting}
					>
						<i class="fas fa-download mr-1.5 text-xs"></i> Export Selection
					</Button>
				</div>
			{/if}
		</div>

		{#if data.invoices.length > 0}
			<div class="overflow-x-auto rounded-sm border border-border bg-surface">
				<table class="w-full min-w-[700px] border-collapse text-left text-xs">
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
							<th class="px-3 py-2.5 font-semibold">Number</th>
							<th class="px-3 py-2.5 font-semibold">Client</th>
							<th class="px-3 py-2.5 font-semibold">Date</th>
							<th class="px-3 py-2.5 font-semibold">Due Date</th>
							<th class="px-3 py-2.5 text-right font-semibold">Total (inc. VAT)</th>
							<th class="px-3 py-2.5 text-center font-semibold">Status</th>
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
									{inv.client?.name || 'Unknown'}
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
											title="View"
											class="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
										>
											<i class="fas fa-eye text-xs"></i>
										</a>
										<a
											href={resolve('/app/invoicing/[id]/edit', { id: inv.id })}
											title="Edit"
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
				No invoices registered for fiscal year {data.year}.
			</div>
		{/if}
	</div>
</div>
