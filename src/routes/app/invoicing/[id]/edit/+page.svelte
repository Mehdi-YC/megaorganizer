<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { formatDZD, numberToFrenchWords } from '$lib/utils/invoice';
	import type { InvoiceLine } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let clients = $state(data.clients || []);
	// svelte-ignore state_referenced_locally
	let products = $state(data.products || []);

	// svelte-ignore state_referenced_locally
	let clientId = $state(data.invoice.clientId);
	// svelte-ignore state_referenced_locally
	let invoiceNumber = $state(data.invoice.invoiceNumber);
	// svelte-ignore state_referenced_locally
	let invoiceDate = $state(new Date(data.invoice.invoiceDate).toISOString().slice(0, 10));
	// svelte-ignore state_referenced_locally
	let dueDate = $state(new Date(data.invoice.dueDate).toISOString().slice(0, 10));
	// svelte-ignore state_referenced_locally
	let status = $state(data.invoice.status);
	// svelte-ignore state_referenced_locally
	let paymentMode = $state(data.invoice.paymentMode || 'Virement bancaire / Chèque');
	// svelte-ignore state_referenced_locally
	let paymentConditions = $state(
		data.invoice.paymentConditions || '30% au démarrage, le solde à la livraison'
	);
	// svelte-ignore state_referenced_locally
	let notes = $state(data.invoice.notes || '');
	// svelte-ignore state_referenced_locally
	let showTvaStamp = $state(data.invoice.showTvaStamp ?? data.invoice.tvaAmount === 0);

	interface FormLine {
		id: string;
		productId: string;
		description: string;
		quantity: number;
		unitPrice: number;
		unit: string;
		tvaRate: number;
	}

	// svelte-ignore state_referenced_locally
	let lines = $state<FormLine[]>(
		data.invoice.lines.map((l: InvoiceLine) => ({
			id: l.id || crypto.randomUUID(),
			productId: l.productId || '',
			description: l.description,
			quantity: l.quantity,
			unitPrice: l.unitPrice,
			unit: l.unit,
			tvaRate: l.tvaRate
		}))
	);

	let isSubmitting = $state(false);

	function addLine() {
		lines = [
			...lines,
			{
				id: crypto.randomUUID(),
				productId: '',
				description: '',
				quantity: 1,
				unitPrice: 0,
				unit: 'Unité(s)',
				tvaRate: 0
			}
		];
	}

	function removeLine(id: string) {
		if (lines.length <= 1) {
			showToast('Une facture doit contenir au moins une ligne', 'info');
			return;
		}
		lines = lines.filter((l) => l.id !== id);
	}

	function onProductSelect(lineIndex: number, prodId: string) {
		const prod = products.find((p) => p.id === prodId);
		if (prod) {
			lines[lineIndex].productId = prod.id;
			lines[lineIndex].description = prod.name + (prod.description ? ` - ${prod.description}` : '');
			lines[lineIndex].unitPrice = prod.unitPrice;
			lines[lineIndex].unit = prod.unit;
			lines[lineIndex].tvaRate = prod.tvaRate;
		}
	}

	const subtotal = $derived(
		lines.reduce((acc, line) => acc + (line.quantity || 0) * (line.unitPrice || 0), 0)
	);

	const tvaAmount = $derived(
		lines.reduce(
			(acc, line) =>
				acc + (line.quantity || 0) * (line.unitPrice || 0) * ((line.tvaRate || 0) / 100),
			0
		)
	);

	const total = $derived(subtotal + tvaAmount);
	const totalWords = $derived(numberToFrenchWords(total));

	async function handleSave() {
		if (!clientId) {
			showToast('Veuillez sélectionner un client', 'error');
			return;
		}
		if (!invoiceNumber.trim()) {
			showToast('Numéro de facture requis', 'error');
			return;
		}
		const validLines = lines.filter((l) => l.description.trim().length > 0);
		if (validLines.length === 0) {
			showToast('Veuillez renseigner au moins une ligne avec une description', 'error');
			return;
		}

		isSubmitting = true;
		try {
			const res = await fetch('/api/invoicing/invoices', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: data.invoice.id,
					clientId,
					invoiceNumber,
					invoiceDate,
					dueDate,
					status,
					paymentMode,
					paymentConditions,
					notes,
					showTvaStamp,
					lines: validLines.map((l, idx) => ({
						productId: l.productId || null,
						description: l.description,
						quantity: Number(l.quantity) || 1,
						unitPrice: Number(l.unitPrice) || 0,
						unit: l.unit || 'Unité(s)',
						tvaRate: Number(l.tvaRate) || 0,
						position: idx
					}))
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Erreur lors de la mise à jour');
			}

			showToast('Facture mise à jour', 'success');
			goto(resolve('/app/invoicing/[id]', { id: data.invoice.id }));
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Échec de la sauvegarde';
			showToast(msg, 'error');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier {data.invoice.invoiceNumber} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	<div class="mb-6">
		<a
			href={resolve('/app/invoicing/[id]', { id: data.invoice.id })}
			class="text-xs text-fg-subdued transition-colors hover:text-fg"
		>
			<i class="fas fa-arrow-left mr-1"></i> Retour à la facture
		</a>
	</div>

	<PageHeader title="Modifier la Facture {data.invoice.invoiceNumber}">
		<div class="flex items-center gap-2">
			<Button
				variant="secondary"
				onclick={() => goto(resolve('/app/invoicing/[id]', { id: data.invoice.id }))}
			>
				Annuler
			</Button>
			<Button onclick={handleSave} disabled={isSubmitting}>
				{#if isSubmitting}
					<i class="fas fa-spinner fa-spin mr-1.5 text-xs"></i> Enregistrement...
				{:else}
					<i class="fas fa-check mr-1.5 text-xs"></i> Mettre à jour
				{/if}
			</Button>
		</div>
	</PageHeader>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<!-- Meta Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<h2 class="mb-4 text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Informations Générales
				</h2>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label for="clientSelect" class="text-xs font-semibold text-fg-accent">
							Client / Entreprise <span class="text-error">*</span>
						</label>
						<select
							id="clientSelect"
							bind:value={clientId}
							class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
						>
							{#each clients as c (c.id)}
								<option value={c.id}>{c.name} {c.city ? `(${c.city})` : ''}</option>
							{/each}
						</select>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="invNumber" class="text-xs font-semibold text-fg-accent">
							Numéro de Facture <span class="text-error">*</span>
						</label>
						<Input id="invNumber" type="text" bind:value={invoiceNumber} required />
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="invDate" class="text-xs font-semibold text-fg-accent">
							Date de Facturation
						</label>
						<input
							id="invDate"
							type="date"
							bind:value={invoiceDate}
							class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="invDue" class="text-xs font-semibold text-fg-accent">
							Date d'Échéance
						</label>
						<input
							id="invDue"
							type="date"
							bind:value={dueDate}
							class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
						/>
					</div>

					<!-- Payment Mode -->
					<div class="flex flex-col gap-1.5">
						<label for="invPayMode" class="text-xs font-semibold text-fg-accent">
							Mode de Règlement
						</label>
						<Input
							id="invPayMode"
							type="text"
							bind:value={paymentMode}
							placeholder="ex: Virement bancaire / Chèque"
						/>
					</div>

					<!-- Payment Conditions -->
					<div class="flex flex-col gap-1.5">
						<label for="invPayCond" class="text-xs font-semibold text-fg-accent">
							Conditions de Paiement
						</label>
						<Input
							id="invPayCond"
							type="text"
							bind:value={paymentConditions}
							placeholder="ex: 30% au démarrage, le solde à la livraison"
						/>
					</div>

					<!-- Tampon Exonération TVA -->
					<div
						class="flex items-center justify-between rounded-sm border border-border bg-bg p-3 sm:col-span-2"
					>
						<div class="flex items-center gap-2.5">
							<input
								id="showTvaStamp"
								type="checkbox"
								bind:checked={showTvaStamp}
								class="h-4 w-4 rounded-sm border-border text-primary focus:ring-0"
							/>
							<label for="showTvaStamp" class="cursor-pointer text-xs font-semibold text-fg">
								Tampon « NON SOUMIS À LA TVA »
							</label>
						</div>
						<span class="text-[11px] text-fg-subdued">
							{showTvaStamp ? 'Affiché sur la facture' : 'Désactivé'}
						</span>
					</div>
				</div>
			</div>

			<!-- Line Items Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
						Prestations & Articles
					</h2>
					<Button size="sm" variant="secondary" onclick={addLine}>
						<i class="fas fa-plus mr-1 text-xs"></i> Ajouter une ligne
					</Button>
				</div>

				<div class="space-y-4">
					{#each lines as line, i (line.id)}
						<div class="rounded-sm border border-border/80 bg-bg p-3">
							<div class="mb-2 flex flex-wrap items-center justify-between gap-1.5">
								<span class="text-[11px] font-semibold text-fg-subdued">Ligne #{i + 1}</span>
								<div class="flex items-center gap-1.5">
									{#if products.length > 0}
										<select
											class="h-7 max-w-[200px] rounded-sm border border-border bg-surface px-2 text-[11px] text-fg focus:outline-none"
											onchange={(e) => onProductSelect(i, (e.target as HTMLSelectElement).value)}
										>
											<option value="">Remplir depuis le catalogue...</option>
											{#each products as p (p.id)}
												<option value={p.id}>{p.name} - {formatDZD(p.unitPrice)}</option>
											{/each}
										</select>
									{/if}
									<button
										type="button"
										class="flex h-7 w-7 items-center justify-center rounded text-fg-subdued hover:bg-muted hover:text-error"
										title="Supprimer la ligne"
										onclick={() => removeLine(line.id)}
									>
										<i class="fas fa-trash-can text-xs"></i>
									</button>
								</div>
							</div>

							<div class="mb-3">
								<input
									type="text"
									bind:value={line.description}
									placeholder="Description du produit ou service..."
									class="h-8 w-full rounded-sm border border-border bg-surface px-2.5 text-xs text-fg focus:outline-none"
								/>
							</div>

							<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
								<div>
									<label for="edit-qty-{line.id}" class="mb-1 block text-[10px] text-fg-subdued"
										>Quantité</label
									>
									<input
										id="edit-qty-{line.id}"
										type="number"
										step="0.01"
										min="0.01"
										bind:value={line.quantity}
										class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:outline-none"
									/>
								</div>
								<div>
									<label for="edit-unit-{line.id}" class="mb-1 block text-[10px] text-fg-subdued"
										>Unité</label
									>
									<input
										id="edit-unit-{line.id}"
										type="text"
										bind:value={line.unit}
										class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:outline-none"
									/>
								</div>
								<div>
									<label for="edit-price-{line.id}" class="mb-1 block text-[10px] text-fg-subdued"
										>Prix Unit. (DA)</label
									>
									<input
										id="edit-price-{line.id}"
										type="number"
										step="0.01"
										min="0"
										bind:value={line.unitPrice}
										class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:outline-none"
									/>
								</div>
								<div>
									<label for="edit-tva-{line.id}" class="mb-1 block text-[10px] text-fg-subdued"
										>TVA</label
									>
									<select
										id="edit-tva-{line.id}"
										bind:value={line.tvaRate}
										class="h-8 w-full rounded-sm border border-border bg-surface px-2 text-xs text-fg focus:outline-none"
									>
										<option value={0}>0%</option>
										<option value={9}>9%</option>
										<option value={19}>19%</option>
									</select>
								</div>
							</div>

							<div class="mt-2 text-right text-xs font-medium text-fg">
								Total : {formatDZD(line.quantity * line.unitPrice)}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Notes Card -->
			<div class="rounded-sm border border-border bg-surface p-5">
				<h2 class="mb-3 text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Notes & Communication
				</h2>
				<textarea
					bind:value={notes}
					rows="3"
					placeholder="Instructions de virement, communication..."
					class="w-full rounded-sm border border-border bg-bg p-3 text-xs text-fg focus:outline-none"
				></textarea>
			</div>
		</div>

		<!-- Summary Column -->
		<div class="space-y-6">
			<div class="rounded-sm border border-border bg-surface p-5">
				<h2 class="mb-4 text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Récapitulatif
				</h2>

				<div class="space-y-3 text-xs">
					<div class="flex justify-between text-fg-subdued">
						<span>Montant Hors Taxes</span>
						<span class="font-medium text-fg">{formatDZD(subtotal)}</span>
					</div>
					<div class="flex justify-between text-fg-subdued">
						<span>TVA Totale</span>
						<span class="font-medium text-fg">{formatDZD(tvaAmount)}</span>
					</div>
					<div class="border-t border-border pt-3">
						<div class="flex justify-between text-sm font-bold text-fg-accent">
							<span>Total TTC</span>
							<span class="text-[#4fa9b2]">{formatDZD(total)}</span>
						</div>
					</div>

					<div class="border-t border-border pt-3">
						<span class="text-[11px] text-fg-subdued">En toutes lettres :</span>
						<div class="mt-1 font-medium text-fg italic">
							{totalWords}
						</div>
					</div>
				</div>

				<div class="mt-6 space-y-3">
					<div class="flex flex-col gap-1.5">
						<label for="invStatus" class="text-xs font-semibold text-fg-accent">Statut</label>
						<select
							id="invStatus"
							bind:value={status}
							class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-xs text-fg focus:outline-none"
						>
							<option value="draft">Brouillon</option>
							<option value="sent">Envoyée</option>
							<option value="paid">Payée</option>
							<option value="cancelled">Annulée</option>
						</select>
					</div>

					<Button class="w-full" onclick={handleSave} disabled={isSubmitting}>
						<i class="fas fa-check mr-1.5 text-xs"></i> Mettre à jour
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
