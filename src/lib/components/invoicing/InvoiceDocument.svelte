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
	class="invoice-sheet mx-auto w-full max-w-[800px] rounded-sm bg-white p-6 text-[#1f2937] shadow-lg sm:p-10 print:m-0 print:max-w-none print:p-0 print:shadow-none"
	id="printable-invoice"
>
	<!-- Header Grid (Brand & Client on Left, Seller Legal on Right) -->
	<div class="flex items-start justify-between gap-6">
		<!-- Left: Brand + Client Box -->
		<div class="max-w-[340px]">
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
					<div class="mt-0.5 text-xs font-medium text-[#4fa9b2]">
						{profile.brandTagline}
					</div>
				{/if}
			</div>

			<!-- Client Box (Positioned on the Left for Single-Page Layout) -->
			<div class="mt-5 text-xs leading-relaxed text-gray-700">
				<div class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Facturé à :</div>
				<div class="mt-0.5 text-sm font-bold text-gray-900">
					{invoice.client.name}
				</div>
				{#if invoice.client.address}<div>{invoice.client.address}</div>{/if}
				<div>
					{#if invoice.client.city}{invoice.client.city}{/if}
					{#if invoice.client.city && invoice.client.country},
					{/if}
					{#if invoice.client.country}{invoice.client.country}{/if}
				</div>
				<div class="mt-1 space-y-0.5 text-[11px] text-gray-600">
					{#if invoice.client.nif || invoice.client.nTva}
						<div>
							<span class="font-semibold text-gray-900">NIF :</span>
							{invoice.client.nif || invoice.client.nTva}
						</div>
					{/if}
					{#if invoice.client.nis}
						<div>
							<span class="font-semibold text-gray-900">NIS :</span>
							{invoice.client.nis}
						</div>
					{/if}
					{#if invoice.client.rc}
						<div>
							<span class="font-semibold text-gray-900">RC :</span>
							{invoice.client.rc}
						</div>
					{/if}
					{#if invoice.client.ai}
						<div>
							<span class="font-semibold text-gray-900">AI :</span>
							{invoice.client.ai}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Seller Legal Info (Always Right Aligned) -->
		<div class="space-y-1 text-right text-xs leading-relaxed text-gray-600">
			<div class="font-semibold text-gray-800">
				{#if profile?.nif}<span>NIF : {profile.nif}</span>{/if}
				{#if profile?.nif && profile?.anae}
					/
				{/if}
				{#if profile?.anae}<span>ANAE : {profile.anae}</span>{/if}
			</div>
			<div class="text-sm font-bold text-gray-900">{profile?.name || ''}</div>
			<div>{profile?.address || ''}</div>
			{#if profile?.phone || profile?.email}
				<div class="text-[11px] text-gray-500">
					{profile?.phone || ''}
					{#if profile?.phone && profile?.email}
						•
					{/if}
					{profile?.email || ''}
				</div>
			{/if}
			{#if profile?.rib}
				<div class="font-mono text-[11px] text-gray-700">
					<span class="font-sans font-semibold text-gray-900">RIB :</span>
					{profile.rib}
				</div>
			{/if}
		</div>
	</div>

	<!-- Invoice Title & Dates -->
	<div class="mt-5 flex items-baseline justify-between gap-4 border-b border-gray-200 pb-2">
		<div class="text-2xl font-semibold text-[#4fa9b2]">
			Facture {invoice.invoiceNumber}
		</div>
		<div class="flex gap-8 text-right text-xs">
			<div>
				<span class="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
					>Date de facturation</span
				>
				<span class="font-medium text-gray-900">{formatDateDZ(invoice.invoiceDate)}</span>
			</div>
			<div>
				<span class="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
					>Échéance</span
				>
				<span class="font-medium text-gray-900">{formatDateDZ(invoice.dueDate)}</span>
			</div>
		</div>
	</div>

	<!-- Items Table -->
	<div class="mt-4 overflow-x-auto print:overflow-visible">
		<table class="w-full min-w-[500px] border-collapse text-xs print:min-w-full">
			<thead>
				<tr class="border-b border-gray-200 text-gray-700">
					<th class="py-2 text-left font-semibold">Description</th>
					<th class="py-2 text-right font-semibold">Quantité</th>
					<th class="py-2 text-right font-semibold">Prix unitaire</th>
					<th class="py-2 text-right font-semibold">Taxes</th>
					<th class="py-2 text-right font-semibold">Montant</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each invoice.lines as line (line.id || line.position)}
					<tr>
						<td class="py-2.5 text-left font-normal text-gray-900">{line.description}</td>
						<td class="py-2.5 text-right text-gray-700">
							{line.quantity.toFixed(2).replace('.', ',')}
							{line.unit}
						</td>
						<td class="py-2.5 text-right text-gray-700">
							{formatDZD(line.unitPrice).replace(' DA', '')}
						</td>
						<td class="py-2.5 text-right text-gray-700">{line.tvaRate}%</td>
						<td class="py-2.5 text-right font-medium text-gray-900">{formatDZD(line.total)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<hr class="mt-3 mb-4 border-gray-200" />

	<!-- Bottom Section: Conditions & Payment on Left, Totals & Stamp on Right -->
	<div class="flex items-start justify-between gap-6">
		<!-- Left: Payment Conditions, Mode & Bank details (Clean typography without border/bg) -->
		<div class="max-w-[340px] space-y-1 text-xs leading-relaxed text-gray-700">
			<div class="text-[11px] font-bold tracking-wider text-gray-900 uppercase">
				Conditions & Règlement
			</div>
			<div>
				<span class="font-semibold text-gray-800">Mode de règlement :</span>
				<span>{invoice.paymentMode || 'Virement bancaire / Chèque'}</span>
			</div>
			<div>
				<span class="font-semibold text-gray-800">Conditions de paiement :</span>
				<span>{invoice.paymentConditions || '30% au démarrage, le solde à la livraison'}</span>
			</div>
			<div>
				<span class="font-semibold text-gray-800">Communication de paiement :</span>
				<strong class="font-bold text-gray-900">{invoice.invoiceNumber}</strong>
			</div>
			{#if profile?.rib}
				<div class="mt-0.5 font-mono text-[11px] text-gray-800">
					<span class="font-sans font-semibold">RIB / RIP :</span>
					{profile.rib}
				</div>
			{/if}
			{#if invoice.notes}
				<div class="mt-0.5 text-[11px] text-gray-500 italic">
					{invoice.notes}
				</div>
			{/if}
		</div>

		<!-- Right: Totals Box, Amount in Words & Stamp -->
		<div class="w-[340px] shrink-0">
			<div class="border-t border-gray-900 pt-1 text-xs">
				<div class="flex justify-between py-0.5 text-gray-700">
					<span>Montant hors taxes</span>
					<span class="font-medium text-gray-900">{formatDZD(invoice.subtotal)}</span>
				</div>
				<div class="flex justify-between py-0.5 text-gray-700">
					<span>TVA (0% - Exonéré IFU)</span>
					<span class="font-medium text-gray-900">0,00 DA</span>
				</div>
				<div
					class="mt-1 flex justify-between border-t border-[#4fa9b2] pt-1.5 text-sm font-bold text-[#4fa9b2]"
				>
					<span>Total Net à Payer</span>
					<span>{formatDZD(invoice.total)}</span>
				</div>
			</div>

			<!-- Amount in Words -->
			<div class="mt-2 text-right text-xs">
				<span class="text-gray-500">Montant total en toutes lettres :</span>
				<div class="mt-0.5 font-medium text-gray-800 italic">
					{formattedTotalWords}
				</div>
			</div>

			<!-- Stamp & Signature Area -->
			<div class="mt-3 flex items-center justify-end gap-3">
				{#if invoice.showTvaStamp ?? invoice.tvaAmount === 0}
					<div
						class="inline-block shrink-0 -rotate-6 rounded-xs border-2 border-red-600 p-0.5 select-none print:border-red-600"
						title="Exonération TVA IFU"
					>
						<div
							class="rounded-2xs border border-red-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-red-600 uppercase print:border-red-600 print:text-red-600"
						>
							NON SOUMIS À LA TVA
						</div>
					</div>
				{/if}
				<div class="relative flex min-h-[75px] w-48 items-center justify-center">
					{#if profile?.stampUrl}
						<img src={profile.stampUrl} alt="Cachet" class="max-h-20 max-w-full object-contain" />
					{/if}
					{#if profile?.signatureUrl}
						<img
							src={profile.signatureUrl}
							alt="Signature"
							class="absolute inset-0 m-auto max-h-18 max-w-full object-contain opacity-95"
						/>
					{/if}
					{#if !profile?.stampUrl && !profile?.signatureUrl}
						<div
							class="flex h-18 w-44 items-center justify-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400"
						>
							Cachet et Signature
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div class="mt-6 border-t border-gray-300 pt-1.5 text-xs text-gray-500">
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
		@page {
			size: A4 portrait;
			margin: 10mm 12mm;
		}

		:global(html),
		:global(body) {
			width: 100% !important;
			height: auto !important;
			background: #ffffff !important;
			background-color: #ffffff !important;
			color: #1f2937 !important;
			color-scheme: light !important;
			margin: 0 !important;
			padding: 0 !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(.no-print) {
			display: none !important;
		}

		.invoice-sheet {
			position: static !important;
			box-sizing: border-box !important;
			width: 100% !important;
			max-width: 100% !important;
			min-height: 0 !important;
			height: auto !important;
			margin: 0 !important;
			padding: 0 !important;
			border: none !important;
			box-shadow: none !important;
			background: #ffffff !important;
			color: #1f2937 !important;
			page-break-inside: avoid !important;
			break-inside: avoid !important;
		}

		.invoice-sheet * {
			page-break-inside: avoid !important;
			break-inside: avoid !important;
		}
	}
</style>
