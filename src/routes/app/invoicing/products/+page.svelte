<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ui/ConfirmButton.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { formatDZD } from '$lib/utils/invoice';
	import type { InvoiceProduct } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let showModal = $state(false);
	let editingProduct = $state<InvoiceProduct | null>(null);
	let confirmDeleteId = $state<string | null>(null);

	// Form fields
	let formName = $state('');
	let formDescription = $state('');
	let formUnitPrice = $state(0);
	let formUnit = $state('Unité(s)');
	let formTvaRate = $state(0);
	let isSaving = $state(false);

	const filteredProducts = $derived(
		(data.products || []).filter((p: InvoiceProduct) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
		})
	);

	function openCreateModal() {
		editingProduct = null;
		formName = '';
		formDescription = '';
		formUnitPrice = 0;
		formUnit = 'Unité(s)';
		formTvaRate = 0;
		showModal = true;
	}

	function openEditModal(p: InvoiceProduct) {
		editingProduct = p;
		formName = p.name || '';
		formDescription = p.description || '';
		formUnitPrice = p.unitPrice || 0;
		formUnit = p.unit || 'Unité(s)';
		formTvaRate = p.tvaRate || 0;
		showModal = true;
	}

	async function handleSubmit() {
		if (!formName.trim()) {
			showToast('Service or item name is required', 'error');
			return;
		}

		isSaving = true;
		try {
			const isEdit = !!editingProduct;
			const res = await fetch('/api/invoicing/products', {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editingProduct?.id,
					name: formName,
					description: formDescription,
					unitPrice: Number(formUnitPrice) || 0,
					unit: formUnit,
					tvaRate: Number(formTvaRate) || 0
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to save');
			}

			showToast(isEdit ? 'Item updated' : 'Item created', 'success');
			showModal = false;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to save';
			showToast(msg, 'error');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			const res = await fetch(`/api/invoicing/products?id=${id}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to delete');
			}
			showToast('Item deleted', 'success');
			confirmDeleteId = null;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to delete';
			showToast(msg, 'error');
		}
	}
</script>

<svelte:head>
	<title>Services - MegaOrganize</title>
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
		title="Services & Products"
		subtitle="Catalog of services and items with default rates and VAT"
		descriptionOnHover
	>
		<Button size="sm" onclick={openCreateModal}>
			<i class="fas fa-plus mr-1 text-xs"></i> Service
		</Button>
	</PageHeader>

	<!-- Search bar -->
	<div class="mb-4 flex items-center justify-between gap-3">
		<div class="relative w-full max-w-xs">
			<i
				class="fas fa-search pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-fg-subdued"
			></i>
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search by name..."
				class="h-8 w-full rounded-sm border border-border-strong bg-bg pr-3 pl-8 text-xs text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
			/>
		</div>
		<span class="text-xs text-fg-subdued">
			{filteredProducts.length} item(s)
		</span>
	</div>

	{#if filteredProducts.length > 0}
		<div class="overflow-x-auto rounded-sm border border-border bg-surface">
			<table class="w-full min-w-[600px] border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
						<th class="px-4 py-2.5 font-semibold">Item / Service</th>
						<th class="px-4 py-2.5 font-semibold">Description</th>
						<th class="px-4 py-2.5 text-right font-semibold">Unit Price</th>
						<th class="px-4 py-2.5 font-semibold">Unit</th>
						<th class="px-4 py-2.5 text-center font-semibold">VAT Rate</th>
						<th class="px-4 py-2.5 text-right font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredProducts as p (p.id)}
						<tr class="transition-colors hover:bg-muted/50">
							<td class="px-4 py-3 font-semibold text-fg">
								{p.name}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{p.description || '-'}
							</td>
							<td class="px-4 py-3 text-right font-medium text-fg">
								{formatDZD(p.unitPrice)}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{p.unit}
							</td>
							<td class="px-4 py-3 text-center text-fg-subdued">
								{p.tvaRate}%
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										type="button"
										class="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
										title="Edit"
										onclick={() => openEditModal(p)}
									>
										<i class="fas fa-pencil text-xs"></i>
									</button>
									<ConfirmButton
										confirmId={confirmDeleteId ?? ''}
										targetId={p.id}
										size="sm"
										onconfirm={() => {
											if (confirmDeleteId === p.id) {
												handleDelete(p.id);
											} else {
												confirmDeleteId = p.id;
												setTimeout(() => {
													if (confirmDeleteId === p.id) confirmDeleteId = null;
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
			icon="fa-box-open"
			message="No products or services"
			submessage="Create your catalog to quickly prefill line items when drafting invoices."
		>
			<Button size="sm" onclick={openCreateModal}>
				<i class="fas fa-plus mr-1.5 text-xs"></i> Add Item
			</Button>
		</EmptyState>
	{/if}
</div>

<!-- Modal Create / Edit Product -->
<Dialog
	open={showModal}
	title={editingProduct ? 'Edit Item' : 'New Item'}
	onclose={() => (showModal = false)}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-3"
	>
		<Input
			label="Name / Title *"
			type="text"
			bind:value={formName}
			placeholder="e.g., Web Development, Server Maintenance..."
			required
		/>

		<div class="flex flex-col gap-1.5">
			<label for="prodDesc" class="text-xs font-semibold text-fg-accent">Description</label>
			<textarea
				id="prodDesc"
				bind:value={formDescription}
				rows="2"
				placeholder="Additional details about the service..."
				class="w-full rounded-sm border border-border bg-bg p-2 text-xs text-fg focus:outline-none"
			></textarea>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<label for="formUnitPrice" class="text-xs font-semibold text-fg-accent"
					>Unit Price (DA) *</label
				>
				<input
					id="formUnitPrice"
					type="number"
					step="0.01"
					min="0"
					bind:value={formUnitPrice}
					class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
					required
				/>
			</div>
			<Input
				label="Unit"
				type="text"
				bind:value={formUnit}
				placeholder="Unit(s), Hour(s), Day(s), Flat fee"
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<label for="tvaRate" class="text-xs font-semibold text-fg-accent">VAT Rate</label>
			<select
				id="tvaRate"
				bind:value={formTvaRate}
				class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
			>
				<option value={0}>0% (Exempt / Not applicable / Freelance)</option>
				<option value={9}>9% (Reduced rate)</option>
				<option value={19}>19% (Standard rate)</option>
			</select>
		</div>

		<div class="flex justify-end gap-2 pt-3">
			<Button variant="secondary" size="sm" type="button" onclick={() => (showModal = false)}>
				Cancel
			</Button>
			<Button size="sm" type="submit" disabled={isSaving}>
				{isSaving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
			</Button>
		</div>
	</form>
</Dialog>
