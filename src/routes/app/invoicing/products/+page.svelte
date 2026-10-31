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
			showToast('Le nom du produit ou service est obligatoire', 'error');
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
				throw new Error(err.error || 'Erreur lors de la sauvegarde');
			}

			showToast(isEdit ? 'Produit mis à jour' : 'Produit créé', 'success');
			showModal = false;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Échec de la sauvegarde';
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
				throw new Error(err.error || 'Impossible de supprimer');
			}
			showToast('Produit supprimé', 'success');
			confirmDeleteId = null;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Échec de suppression';
			showToast(msg, 'error');
		}
	}
</script>

<svelte:head>
	<title>Produits & Services - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6">
		<a
			href={resolve('/app/invoicing')}
			class="text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left mr-1"></i> Retour à la facturation
		</a>
	</div>

	<PageHeader
		title="Produits & Services"
		subtitle="Catalogue de prestations et articles avec tarifs et taux de TVA par défaut"
	>
		<Button size="sm" onclick={openCreateModal}>
			<i class="fas fa-plus mr-1.5 text-xs"></i> Nouveau Produit / Service
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
				placeholder="Rechercher par libellé..."
				class="h-8 w-full rounded-sm border border-border-strong bg-bg pr-3 pl-8 text-xs text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
			/>
		</div>
		<span class="text-xs text-fg-subdued">
			{filteredProducts.length} référence(s)
		</span>
	</div>

	{#if filteredProducts.length > 0}
		<div class="overflow-x-auto rounded-sm border border-border bg-surface">
			<table class="w-full min-w-[600px] border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
						<th class="px-4 py-2.5 font-semibold">Libellé</th>
						<th class="px-4 py-2.5 font-semibold">Description</th>
						<th class="px-4 py-2.5 text-right font-semibold">Prix Unitaire</th>
						<th class="px-4 py-2.5 font-semibold">Unité</th>
						<th class="px-4 py-2.5 text-center font-semibold">Taux TVA</th>
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
										title="Modifier"
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
			message="Aucun produit ou service"
			submessage="Créez votre catalogue pour pré-remplir automatiquement les lignes de vos factures."
		>
			<Button size="sm" onclick={openCreateModal}>
				<i class="fas fa-plus mr-1.5 text-xs"></i> Ajouter une référence
			</Button>
		</EmptyState>
	{/if}
</div>

<!-- Modal Create / Edit Product -->
<Dialog
	open={showModal}
	title={editingProduct ? 'Modifier la Référence' : 'Nouvelle Référence'}
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
			label="Désignation / Nom *"
			type="text"
			bind:value={formName}
			placeholder="ex: Développement site web, Maintenance serveur..."
			required
		/>

		<div class="flex flex-col gap-1.5">
			<label for="prodDesc" class="text-xs font-semibold text-fg-accent">Description</label>
			<textarea
				id="prodDesc"
				bind:value={formDescription}
				rows="2"
				placeholder="Détails complémentaires de la prestation..."
				class="w-full rounded-sm border border-border bg-bg p-2 text-xs text-fg focus:outline-none"
			></textarea>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<label for="formUnitPrice" class="text-xs font-semibold text-fg-accent"
					>Prix Unitaire (DA) *</label
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
				label="Unité"
				type="text"
				bind:value={formUnit}
				placeholder="Unité(s), Heure(s), Jour(s), Forfait"
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<label for="tvaRate" class="text-xs font-semibold text-fg-accent">Taux TVA</label>
			<select
				id="tvaRate"
				bind:value={formTvaRate}
				class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
			>
				<option value={0}>0% (Exonéré / Non applicable / Auto-entrepreneur)</option>
				<option value={9}>9% (Taux réduit)</option>
				<option value={19}>19% (Taux normal)</option>
			</select>
		</div>

		<div class="flex justify-end gap-2 pt-3">
			<Button variant="secondary" size="sm" type="button" onclick={() => (showModal = false)}>
				Annuler
			</Button>
			<Button size="sm" type="submit" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
			</Button>
		</div>
	</form>
</Dialog>
