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
	import type { InvoiceClient } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let showModal = $state(false);
	let editingClient = $state<InvoiceClient | null>(null);
	let confirmDeleteId = $state<string | null>(null);

	// Form fields
	let formName = $state('');
	let formAddress = $state('');
	let formCity = $state('');
	let formWilaya = $state('');
	let formCountry = $state('Algérie');
	let formNif = $state('');
	let formNis = $state('');
	let formRc = $state('');
	let formAi = $state('');
	let formNTva = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let isSaving = $state(false);

	const filteredClients = $derived(
		(data.clients || []).filter((c: InvoiceClient) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				c.name?.toLowerCase().includes(q) ||
				c.city?.toLowerCase().includes(q) ||
				c.nif?.toLowerCase().includes(q)
			);
		})
	);

	function openCreateModal() {
		editingClient = null;
		formName = '';
		formAddress = '';
		formCity = '';
		formWilaya = '';
		formCountry = 'Algérie';
		formNif = '';
		formNis = '';
		formRc = '';
		formAi = '';
		formNTva = '';
		formPhone = '';
		formEmail = '';
		showModal = true;
	}

	function openEditModal(c: InvoiceClient) {
		editingClient = c;
		formName = c.name || '';
		formAddress = c.address || '';
		formCity = c.city || '';
		formWilaya = c.wilaya || '';
		formCountry = c.country || 'Algérie';
		formNif = c.nif || '';
		formNis = c.nis || '';
		formRc = c.rc || '';
		formAi = c.ai || '';
		formNTva = c.nTva || '';
		formPhone = c.phone || '';
		formEmail = c.email || '';
		showModal = true;
	}

	async function handleSubmit() {
		if (!formName.trim()) {
			showToast('Client name is required', 'error');
			return;
		}

		isSaving = true;
		try {
			const isEdit = !!editingClient;
			const res = await fetch('/api/invoicing/clients', {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editingClient?.id,
					name: formName,
					address: formAddress,
					city: formCity,
					wilaya: formWilaya,
					country: formCountry,
					nif: formNif,
					nis: formNis,
					rc: formRc,
					ai: formAi,
					nTva: formNif || formNTva,
					phone: formPhone,
					email: formEmail
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to save client');
			}

			showToast(isEdit ? 'Client updated' : 'Client created', 'success');
			showModal = false;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to save client';
			showToast(msg, 'error');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			const res = await fetch(`/api/invoicing/clients?id=${id}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to delete client');
			}
			showToast('Client deleted', 'success');
			confirmDeleteId = null;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to delete client';
			showToast(msg, 'error');
		}
	}
</script>

<svelte:head>
	<title>Clients & Companies - MegaOrganize</title>
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
		title="Clients & Companies"
		subtitle="Directory of client profiles and tax identifiers for quick invoicing"
		descriptionOnHover
	>
		<Button size="sm" onclick={openCreateModal}>
			<i class="fas fa-plus mr-1 text-xs"></i> Client
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
				placeholder="Search by name, city, NIF..."
				class="h-8 w-full rounded-sm border border-border-strong bg-bg pr-3 pl-8 text-xs text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
			/>
		</div>
		<span class="text-xs text-fg-subdued">
			{filteredClients.length} client(s)
		</span>
	</div>

	{#if filteredClients.length > 0}
		<div class="overflow-x-auto rounded-sm border border-border bg-surface">
			<table class="w-full min-w-[650px] border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
						<th class="px-4 py-2.5 font-semibold">Name / Company</th>
						<th class="px-4 py-2.5 font-semibold">Location</th>
						<th class="px-4 py-2.5 font-semibold">Tax IDs</th>
						<th class="px-4 py-2.5 font-semibold">Contact</th>
						<th class="px-4 py-2.5 text-right font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredClients as c (c.id)}
						<tr class="transition-colors hover:bg-muted/50">
							<td class="px-4 py-3 font-semibold text-fg">
								{c.name}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{#if c.city}{c.city},
								{/if}{c.country || 'Algeria'}
								{#if c.address}
									<div class="text-[11px] text-fg-subdued/80">{c.address}</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{#if c.nif}<div>NIF: <span class="text-fg">{c.nif}</span></div>{/if}
								{#if c.nTva}<div>VAT: <span class="text-fg">{c.nTva}</span></div>{/if}
								{#if c.rc}<div>RC: <span class="text-fg">{c.rc}</span></div>{/if}
								{#if !c.nif && !c.nTva && !c.rc}
									<span class="text-[11px] text-fg-subdued/60 italic">Not set</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{#if c.phone}<div>{c.phone}</div>{/if}
								{#if c.email}<div>{c.email}</div>{/if}
								{#if !c.phone && !c.email}
									<span class="text-[11px] text-fg-subdued/60 italic">-</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										type="button"
										class="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
										title="Edit"
										onclick={() => openEditModal(c)}
									>
										<i class="fas fa-pencil text-xs"></i>
									</button>
									<ConfirmButton
										confirmId={confirmDeleteId ?? ''}
										targetId={c.id}
										size="sm"
										onconfirm={() => {
											if (confirmDeleteId === c.id) {
												handleDelete(c.id);
											} else {
												confirmDeleteId = c.id;
												setTimeout(() => {
													if (confirmDeleteId === c.id) confirmDeleteId = null;
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
			icon="fa-building"
			message="No clients registered"
			submessage="Add your clients and business partners to quickly select them when creating invoices."
		>
			<Button size="sm" onclick={openCreateModal}>
				<i class="fas fa-plus mr-1.5 text-xs"></i> Add Client
			</Button>
		</EmptyState>
	{/if}
</div>

<!-- Modal Create / Edit Client -->
<Dialog
	open={showModal}
	title={editingClient ? 'Edit Client' : 'New Client'}
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
			label="Name / Company Name *"
			type="text"
			bind:value={formName}
			placeholder="e.g., Acme Corporation"
			required
		/>

		<Input
			label="Address"
			type="text"
			bind:value={formAddress}
			placeholder="e.g., 123 Main Street"
		/>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Input label="City" type="text" bind:value={formCity} placeholder="e.g., Algiers" />
			<Input
				label="State / Region"
				type="text"
				bind:value={formWilaya}
				placeholder="e.g., Algiers (16)"
			/>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Input label="Country" type="text" bind:value={formCountry} placeholder="Algeria" />
			<Input
				label="NIF (Tax ID)"
				type="text"
				bind:value={formNif}
				placeholder="e.g., 000616097210737"
			/>
		</div>

		<div class="grid grid-cols-3 gap-2 sm:gap-3">
			<Input label="NIS" type="text" bind:value={formNis} placeholder="NIS" />
			<Input label="RC" type="text" bind:value={formRc} placeholder="RC" />
			<Input label="AI" type="text" bind:value={formAi} placeholder="AI" />
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Input label="Phone" type="text" bind:value={formPhone} placeholder="+213 ..." />
			<Input label="Email" type="email" bind:value={formEmail} placeholder="contact@..." />
		</div>

		<div class="flex justify-end gap-2 pt-3">
			<Button variant="secondary" size="sm" type="button" onclick={() => (showModal = false)}>
				Cancel
			</Button>
			<Button size="sm" type="submit" disabled={isSaving}>
				{isSaving ? 'Saving...' : editingClient ? 'Update' : 'Create'}
			</Button>
		</div>
	</form>
</Dialog>
