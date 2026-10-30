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
			showToast('Le nom du client est obligatoire', 'error');
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
					nTva: formNTva,
					phone: formPhone,
					email: formEmail
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Erreur lors de la sauvegarde');
			}

			showToast(isEdit ? 'Client mis à jour' : 'Client créé', 'success');
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
			const res = await fetch(`/api/invoicing/clients?id=${id}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Impossible de supprimer');
			}
			showToast('Client supprimé', 'success');
			confirmDeleteId = null;
			await invalidateAll();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Échec de suppression';
			showToast(msg, 'error');
		}
	}
</script>

<svelte:head>
	<title>Clients & Entreprises - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-4 sm:p-8">
	<div class="mb-6">
		<a
			href={resolve('/app/invoicing')}
			class="text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left mr-1"></i> Retour à la facturation
		</a>
	</div>

	<PageHeader
		title="Clients & Entreprises"
		subtitle="Répertoire de vos clients et informations fiscales réutilisables"
	>
		<Button size="sm" onclick={openCreateModal}>
			<i class="fas fa-plus mr-1.5 text-xs"></i> Nouveau Client
		</Button>
	</PageHeader>

	<!-- Search bar -->
	<div class="mb-4 flex items-center justify-between gap-3">
		<div class="relative w-full max-w-xs">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Rechercher par nom, ville, NIF..."
				class="h-8 w-full rounded-sm border border-border bg-surface px-3 text-xs text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
			/>
		</div>
		<span class="text-xs text-fg-subdued">
			{filteredClients.length} client(s)
		</span>
	</div>

	{#if filteredClients.length > 0}
		<div class="overflow-x-auto rounded-sm border border-border bg-surface">
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-border bg-bg-subdued text-fg-subdued">
						<th class="px-4 py-2.5 font-semibold">Nom / Entreprise</th>
						<th class="px-4 py-2.5 font-semibold">Localisation</th>
						<th class="px-4 py-2.5 font-semibold">Identifiants Fiscaux</th>
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
								{/if}{c.country || 'Algérie'}
								{#if c.address}
									<div class="text-[11px] text-fg-subdued/80">{c.address}</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-fg-subdued">
								{#if c.nif}<div>NIF: <span class="text-fg">{c.nif}</span></div>{/if}
								{#if c.nTva}<div>N° TVA: <span class="text-fg">{c.nTva}</span></div>{/if}
								{#if c.rc}<div>RC: <span class="text-fg">{c.rc}</span></div>{/if}
								{#if !c.nif && !c.nTva && !c.rc}
									<span class="text-[11px] text-fg-subdued/60 italic">Non renseigné</span>
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
										title="Modifier"
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
			message="Aucun client enregistré"
			submessage="Ajoutez vos clients et entreprises partenaires pour les sélectionner rapidement lors de la facturation."
		>
			<Button size="sm" onclick={openCreateModal}>
				<i class="fas fa-plus mr-1.5 text-xs"></i> Ajouter un client
			</Button>
		</EmptyState>
	{/if}
</div>

<!-- Modal Create / Edit Client -->
<Dialog
	open={showModal}
	title={editingClient ? 'Modifier le Client' : 'Nouveau Client'}
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
			label="Nom / Raison Sociale *"
			type="text"
			bind:value={formName}
			placeholder="ex: NORD SUD INTEGRATION"
			required
		/>

		<Input label="Adresse" type="text" bind:value={formAddress} placeholder="ex: Mohammadia" />

		<div class="grid grid-cols-2 gap-3">
			<Input label="Ville" type="text" bind:value={formCity} placeholder="ex: Alger" />
			<Input label="Wilaya" type="text" bind:value={formWilaya} placeholder="ex: Alger (16)" />
		</div>

		<div class="grid grid-cols-2 gap-3">
			<Input label="Pays" type="text" bind:value={formCountry} placeholder="Algérie" />
			<Input label="N° TVA" type="text" bind:value={formNTva} placeholder="ex: 000616097210737" />
		</div>

		<div class="grid grid-cols-3 gap-3">
			<Input label="NIF" type="text" bind:value={formNif} placeholder="NIF" />
			<Input label="NIS" type="text" bind:value={formNis} placeholder="NIS" />
			<Input label="RC" type="text" bind:value={formRc} placeholder="RC" />
		</div>

		<div class="grid grid-cols-2 gap-3">
			<Input label="Article d'Imposition (AI)" type="text" bind:value={formAi} placeholder="AI" />
			<Input label="Téléphone" type="text" bind:value={formPhone} placeholder="+213 ..." />
		</div>

		<Input label="Email" type="email" bind:value={formEmail} placeholder="contact@..." />

		<div class="flex justify-end gap-2 pt-3">
			<Button variant="secondary" size="sm" type="button" onclick={() => (showModal = false)}>
				Annuler
			</Button>
			<Button size="sm" type="submit" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : editingClient ? 'Mettre à jour' : 'Créer'}
			</Button>
		</div>
	</form>
</Dialog>
