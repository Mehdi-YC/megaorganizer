<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import InvoiceDocument from '$lib/components/invoicing/InvoiceDocument.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		// Delay slightly to let fonts, stylesheets, and images render before opening the print dialog
		const timer = setTimeout(() => {
			window.print();
		}, 350);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.invoice.invoiceNumber} - Impression</title>
</svelte:head>

<div class="min-h-screen bg-[#f3f4f6] py-6 text-gray-900 print:bg-white print:p-0">
	<!-- Top Bar for Preview & Manual Print Trigger (Hidden during print) -->
	<div
		class="no-print mx-auto mb-6 flex max-w-[800px] items-center justify-between rounded-sm border border-border bg-surface px-4 py-3 shadow-xs"
	>
		<a href={resolve('/app/invoicing/[id]', { id: data.invoice.id })}>
			<Button variant="secondary" size="sm">
				<i class="fas fa-arrow-left mr-1.5 text-xs"></i>
				Retour à la facture
			</Button>
		</a>

		<div class="flex items-center gap-2">
			<Button size="sm" onclick={() => window.print()}>
				<i class="fas fa-print mr-1.5 text-xs"></i>
				Imprimer / Enregistrer en PDF
			</Button>
		</div>
	</div>

	<!-- Standalone Printable Invoice Document -->
	<div class="print:m-0 print:p-0">
		<InvoiceDocument invoice={data.invoice} profile={data.profile} />
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: #ffffff !important;
			color: #111827 !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		.no-print,
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
