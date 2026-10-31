<script lang="ts">
	import type { InvoiceWithDetails, InvoiceUserData } from '$lib/types';
	import { formatDZD, formatDateDZ, numberToFrenchWords } from '$lib/utils/invoice';

	let {
		invoice,
		profile
	}: {
		invoice: InvoiceWithDetails;
		profile: Partial<InvoiceUserData> | null;
	} = $props();

	const formattedTotalWords = $derived(numberToFrenchWords(invoice.total));
</script>

<div
	class="invoice-sheet mx-auto max-w-[800px] rounded-sm bg-white p-8 text-[#1f2937] shadow-lg sm:p-12"
	id="printable-invoice"
>
	<!-- Header -->
	<div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
		<div>
			<div class="text-3xl font-extrabold tracking-tight text-gray-900">
				{#if profile?.brandName}
					{@const words = profile.brandName.split(' ')}
					{words[0]} <span class="text-[#4fa9b2]">{words.slice(1).join(' ')}</span>
				{:else}
					{profile?.name || 'Facture'}
				{/if}
			</div>
			{#if profile?.brandTagline}
				<div class="mt-1 text-sm font-medium text-[#4fa9b2]">
					{profile.brandTagline}
				</div>
			{/if}
		</div>

		<div class="space-y-0.5 text-right text-xs text-gray-500">
			<div>
				{#if profile?.nif}<span>NIF : {profile.nif}</span>{/if}
				{#if profile?.nif && profile?.anae}
					/
				{/if}
				{#if profile?.anae}<span>ANAE : {profile.anae}</span>{/if}
			</div>
			<div class="font-bold text-gray-800">{profile?.name || ''}</div>
			<div>{profile?.address || ''}</div>
		</div>
	</div>

	<!-- Client Box -->
	<div class="mt-10 ml-auto max-w-[280px] text-left text-xs leading-relaxed text-gray-700">
		<div class="text-sm font-bold tracking-wide text-gray-900 uppercase">
			{invoice.client.name}
		</div>
		{#if invoice.client.address}<div>{invoice.client.address}</div>{/if}
		{#if invoice.client.city}<div>{invoice.client.city}</div>{/if}
		{#if invoice.client.country}<div>{invoice.client.country}</div>{/if}
		{#if invoice.client.nTva}
			<div class="mt-1 font-medium text-gray-900">N° TVA: {invoice.client.nTva}</div>
		{/if}
		{#if invoice.client.nif}
			<div>NIF: {invoice.client.nif}</div>
		{/if}
		{#if invoice.client.rc}
			<div>RC: {invoice.client.rc}</div>
		{/if}
		{#if invoice.client.ai}
			<div>AI: {invoice.client.ai}</div>
		{/if}
	</div>

	<!-- Invoice Title & Number -->
	<div class="mt-8 text-2xl font-medium text-[#4fa9b2]">
		Facture {invoice.invoiceNumber}
	</div>

	<!-- Dates -->
	<div class="mt-4 flex gap-12 text-xs">
		<div>
			<span class="block font-semibold text-gray-900">Date de facturation</span>
			<span class="text-gray-600">{formatDateDZ(invoice.invoiceDate)}</span>
		</div>
		<div>
			<span class="block font-semibold text-gray-900">Échéance</span>
			<span class="text-gray-600">{formatDateDZ(invoice.dueDate)}</span>
		</div>
	</div>

	<!-- Table -->
	<div class="mt-6 overflow-x-auto">
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-200 text-gray-700">
					<th class="py-2.5 text-left font-semibold">Description</th>
					<th class="py-2.5 text-right font-semibold">Quantité</th>
					<th class="py-2.5 text-right font-semibold">Prix unitaire</th>
					<th class="py-2.5 text-right font-semibold">Taxes</th>
					<th class="py-2.5 text-right font-semibold">Montant</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each invoice.lines as line (line.id || line.position)}
					<tr>
						<td class="py-3 text-left font-normal text-gray-900">{line.description}</td>
						<td class="py-3 text-right text-gray-700">
							{line.quantity.toFixed(2).replace('.', ',')}
							{line.unit}
						</td>
						<td class="py-3 text-right text-gray-700">
							{formatDZD(line.unitPrice).replace(' DA', '')}
						</td>
						<td class="py-3 text-right text-gray-700">{line.tvaRate}%</td>
						<td class="py-3 text-right font-medium text-gray-900">{formatDZD(line.total)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Totals and Payment Communication -->
	<div class="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
		<div class="text-xs text-gray-700">
			<div>
				Communication de paiement :
				<strong class="font-bold text-gray-900">{invoice.invoiceNumber}</strong>
			</div>
			{#if invoice.notes}
				<div class="mt-2 text-xs whitespace-pre-wrap text-gray-500">{invoice.notes}</div>
			{/if}
		</div>

		<div class="w-full sm:w-[320px]">
			<div class="border-t border-gray-700 pt-2 text-xs">
				<div class="flex justify-between py-1 text-gray-700">
					<span>Montant hors taxes</span>
					<span class="font-medium text-gray-900">{formatDZD(invoice.subtotal)}</span>
				</div>
				<div class="flex justify-between py-1 text-gray-700">
					<span>TVA</span>
					<span class="font-medium text-gray-900">{formatDZD(invoice.tvaAmount)}</span>
				</div>
				<div
					class="mt-1 flex justify-between border-t border-[#4fa9b2] pt-2 text-sm font-bold text-[#4fa9b2]"
				>
					<span>Total</span>
					<span>{formatDZD(invoice.total)}</span>
				</div>
			</div>

			<!-- Amount in Words -->
			<div class="mt-4 text-right text-xs">
				<span class="text-gray-500">Montant total en toutes lettres :</span>
				<div class="mt-0.5 font-medium text-gray-800 italic">
					{formattedTotalWords}
				</div>
			</div>

			<!-- Stamp & Signature Area -->
			<div class="mt-6 flex justify-end">
				<div class="relative flex min-h-[90px] w-52 items-center justify-center">
					{#if profile?.stampUrl}
						<img src={profile.stampUrl} alt="Cachet" class="max-h-24 max-w-full object-contain" />
					{/if}
					{#if profile?.signatureUrl}
						<img
							src={profile.signatureUrl}
							alt="Signature"
							class="absolute inset-0 m-auto max-h-20 max-w-full object-contain opacity-95"
						/>
					{/if}
					{#if !profile?.stampUrl && !profile?.signatureUrl}
						<div
							class="flex h-20 w-44 items-center justify-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400"
						>
							Cachet et Signature
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div class="mt-16 border-t border-gray-300 pt-3 text-xs text-gray-500">
		<div class="flex justify-between">
			<div>
				{#if profile?.phone}<span>{profile.phone}</span>{/if}
				{#if profile?.email}<span class="ml-2">{profile.email}</span>{/if}
			</div>
			<div>Page 1 / 1</div>
		</div>
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: #ffffff !important;
			color: #1f2937 !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		/* Isolate print strictly to the invoice sheet: absolutely nothing else in the UI will print */
		:global(body *) {
			visibility: hidden !important;
		}

		.invoice-sheet,
		.invoice-sheet * {
			visibility: visible !important;
		}

		.invoice-sheet {
			position: absolute !important;
			left: 0 !important;
			top: 0 !important;
			width: 100% !important;
			max-width: 100% !important;
			margin: 0 !important;
			padding: 10mm 15mm !important;
			border: none !important;
			box-shadow: none !important;
			background: #ffffff !important;
			color: #1f2937 !important;
			z-index: 999999 !important;
		}

		:global(.no-print) {
			display: none !important;
		}
	}
</style>
