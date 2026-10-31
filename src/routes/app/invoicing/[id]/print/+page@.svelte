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
	<title>{data.invoice.invoiceNumber} - Print</title>
</svelte:head>

<div
	class="min-h-screen bg-white py-6 text-gray-900 print:min-h-0 print:bg-white print:p-0"
	style="color-scheme: light;"
>
	<!-- Top Bar for Preview & Manual Print Trigger (Hidden during print) -->
	<div
		class="no-print mx-auto mb-6 flex max-w-[800px] items-center justify-between rounded-sm border border-gray-200 bg-gray-50 px-4 py-3 shadow-xs print:hidden"
	>
		<a href={resolve('/app/invoicing/[id]', { id: data.invoice.id })}>
			<Button variant="secondary" size="sm">
				<i class="fas fa-arrow-left mr-1.5 text-xs"></i>
				Back to invoice
			</Button>
		</a>

		<div class="flex items-center gap-2">
			<Button size="sm" onclick={() => window.print()}>
				<i class="fas fa-print mr-1.5 text-xs"></i>
				Print / Save as PDF
			</Button>
		</div>
	</div>

	<!-- Standalone Printable Invoice Document -->
	<div class="print:m-0 print:p-0">
		<InvoiceDocument invoice={data.invoice} profile={data.profile} />
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		color-scheme: light !important;
		background: #ffffff !important;
		background-color: #ffffff !important;
		color: #111827 !important;
	}

	@media print {
		@page {
			size: A4 portrait;
			margin: 10mm 12mm;
		}

		:global(html),
		:global(body) {
			background: #ffffff !important;
			background-color: #ffffff !important;
			color: #111827 !important;
			color-scheme: light !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			height: auto !important;
			box-shadow: none !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		.no-print,
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
