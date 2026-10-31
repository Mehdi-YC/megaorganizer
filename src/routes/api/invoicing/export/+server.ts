import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getInvoices,
	getInvoice,
	getYearlyDocs,
	getYearlyDocFilePath,
	getUserInvoiceProfile,
	getUserMediaFilePath,
	formatDZD,
	formatDateDZ,
	numberToFrenchWords
} from '$lib/server/services/invoice.service';
import type { InvoiceWithDetails, InvoiceUserData, InvoiceLine } from '$lib/types';
import { PassThrough, Readable } from 'stream';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const archiver: any = require('archiver');

function generateInvoiceHtml(
	inv: InvoiceWithDetails,
	profile: Partial<InvoiceUserData> | null,
	stampBase64?: string | null,
	signatureBase64?: string | null
): string {
	const totalWords = numberToFrenchWords(inv.total);
	const linesHtml = inv.lines
		.map(
			(line: InvoiceLine) => `
		<tr>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${line.description}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${line.quantity.toFixed(2).replace('.', ',')} ${line.unit}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatDZD(line.unitPrice).replace(' DA', '')}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${line.tvaRate}%</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${formatDZD(line.total)}</td>
		</tr>
	`
		)
		.join('');

	return `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="UTF-8">
	<title>${inv.invoiceNumber}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			color: #1f2937;
			background: #fff;
			margin: 0;
			padding: 20px;
			font-size: 13px;
			line-height: 1.4;
		}
		.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
		.brand-name { font-size: 26px; font-weight: bold; color: #111827; }
		.brand-name span { color: #38bdf8; }
		.brand-tagline { color: #0284c7; font-size: 13px; margin-top: 4px; }
		.seller-info { text-align: right; font-size: 12px; color: #4b5563; }
		.client-box { margin-left: auto; width: 300px; text-align: left; margin-bottom: 30px; font-size: 13px; }
		.title { font-size: 24px; font-weight: 500; color: #38bdf8; margin: 25px 0 15px; }
		.dates { display: flex; gap: 60px; margin-bottom: 25px; }
		.dates div { font-size: 12px; }
		.dates strong { display: block; margin-bottom: 3px; font-weight: 600; color: #111827; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
		th { padding: 10px 8px; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; color: #374151; }
		.totals-area { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 15px; }
		.payment-comm { font-size: 12px; color: #374151; }
		.totals-table { width: 320px; font-size: 13px; }
		.totals-table div { display: flex; justify-content: space-between; padding: 6px 0; }
		.totals-table .total-row { border-top: 2px solid #111827; color: #0284c7; font-size: 15px; font-weight: bold; padding-top: 10px; }
		.words { margin-top: 15px; text-align: right; font-size: 12px; color: #4b5563; }
		.words-val { font-style: italic; color: #111827; margin-top: 3px; }
		.stamps { margin-top: 30px; display: flex; justify-content: flex-end; gap: 20px; }
		.footer { position: fixed; bottom: 15mm; left: 15mm; right: 15mm; border-top: 1px solid #9ca3af; padding-top: 8px; display: flex; justify-content: space-between; font-size: 12px; color: #4b5563; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<div class="brand-name">${profile?.brandName || profile?.name || 'Facture'}</div>
			${profile?.brandTagline ? `<div class="brand-tagline">${profile.brandTagline}</div>` : ''}
		</div>
		<div class="seller-info">
			<div>NIF : ${profile?.nif || ''} ${profile?.anae ? `/ ANAE : ${profile.anae}` : ''}</div>
			<div style="font-weight: 600; margin-top: 2px;">${profile?.name || ''}</div>
			<div>${profile?.address || ''}</div>
		</div>
	</div>

	<div class="client-box">
		<div style="font-weight: 700; font-size: 14px;">${inv.client.name}</div>
		${inv.client.address ? `<div>${inv.client.address}</div>` : ''}
		${inv.client.city ? `<div>${inv.client.city}</div>` : ''}
		${inv.client.country ? `<div>${inv.client.country}</div>` : ''}
		${inv.client.nTva ? `<div style="margin-top: 4px;">N° TVA: ${inv.client.nTva}</div>` : ''}
		${inv.client.nif ? `<div>NIF: ${inv.client.nif}</div>` : ''}
	</div>

	<div class="title">Facture ${inv.invoiceNumber}</div>

	<div class="dates">
		<div>
			<strong>Date de facturation</strong>
			${formatDateDZ(inv.invoiceDate)}
		</div>
		<div>
			<strong>Échéance</strong>
			${formatDateDZ(inv.dueDate)}
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="text-align: left;">Description</th>
				<th style="text-align: right;">Quantité</th>
				<th style="text-align: right;">Prix unitaire</th>
				<th style="text-align: right;">Taxes</th>
				<th style="text-align: right;">Montant</th>
			</tr>
		</thead>
		<tbody>
			${linesHtml}
		</tbody>
	</table>

	<div class="totals-area">
		<div class="payment-comm">
			Communication de paiement : <strong>${inv.invoiceNumber}</strong>
			${inv.notes ? `<div style="margin-top: 8px; color: #6b7280;">${inv.notes}</div>` : ''}
		</div>

		<div class="totals-table">
			<div>
				<span>Montant hors taxes</span>
				<span>${formatDZD(inv.subtotal)}</span>
			</div>
			<div>
				<span>TVA</span>
				<span>${formatDZD(inv.tvaAmount)}</span>
			</div>
			<div class="total-row">
				<span>Total</span>
				<span>${formatDZD(inv.total)}</span>
			</div>
			<div class="words">
				Montant total en toutes lettres :
				<div class="words-val">${totalWords}</div>
			</div>

			<div class="stamps">
				<div style="position: relative; width: 220px; min-height: 90px; display: flex; align-items: center; justify-content: center;">
					${stampBase64 ? `<img src="${stampBase64}" alt="Cachet" style="max-height: 96px; max-width: 100%; object-fit: contain;" />` : ''}
					${signatureBase64 ? `<img src="${signatureBase64}" alt="Signature" style="position: absolute; inset: 0; margin: auto; max-height: 80px; max-width: 100%; object-fit: contain; opacity: 0.95;" />` : ''}
					${!stampBase64 && !signatureBase64 ? `<div style="border: 1px dashed #d1d5db; padding: 20px; font-size: 11px; color: #9ca3af; border-radius: 4px;">Cachet et Signature</div>` : ''}
				</div>
			</div>
		</div>
	</div>

	<div class="footer">
		<div>${profile?.phone || ''} ${profile?.email ? `${profile.email}` : ''}</div>
		<div>Page 1 / 1</div>
	</div>
</body>
</html>`;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const { exportType, year, invoiceIds } = body;

	const profile = await getUserInvoiceProfile(locals.user.id);

	// Pre-load stamp and signature if available as base64 for self-contained HTML
	let stampBase64: string | null = null;
	let signatureBase64: string | null = null;
	try {
		const stampPath = await getUserMediaFilePath(locals.user.id, 'stamp');
		if (stampPath) {
			const buf = await readFile(stampPath);
			stampBase64 = `data:image/png;base64,${buf.toString('base64')}`;
		}
	} catch {
		// continue without stamp
	}

	try {
		const sigPath = await getUserMediaFilePath(locals.user.id, 'signature');
		if (sigPath) {
			const buf = await readFile(sigPath);
			signatureBase64 = `data:image/png;base64,${buf.toString('base64')}`;
		}
	} catch {
		// continue without signature
	}

	// Single invoice clean HTML download (100% isolated, zero UI components)
	if (exportType === 'single_html' && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
		const inv = await getInvoice(locals.user.id, invoiceIds[0]);
		if (!inv) return json({ error: 'Invoice not found' }, { status: 404 });
		const html = generateInvoiceHtml(inv, profile, stampBase64, signatureBase64);
		const filename = `${inv.invoiceNumber.replace(/\//g, '_')}.html`;
		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	}

	const archive = archiver('zip', { zlib: { level: 9 } });
	const passThrough = new PassThrough();

	archive.pipe(passThrough);

	if (exportType === 'year' && year) {
		const targetYear = parseInt(year, 10);
		// 1. Fetch G12 and G12 bis docs
		const docs = await getYearlyDocs(locals.user.id, targetYear);
		for (const doc of docs) {
			const filePath = await getYearlyDocFilePath(locals.user.id, doc.storedName);
			if (filePath) {
				try {
					const fileBuf = await readFile(filePath);
					archive.append(fileBuf, {
						name: `declarations/${doc.docType.toUpperCase()}_${doc.originalName}`
					});
				} catch {
					// continue
				}
			}
		}

		// 2. Fetch all invoices for this year
		const invoices = await getInvoices(locals.user.id, targetYear);
		let csvContent = 'Numéro;Client;Date;Échéance;Statut;Montant HT (DA);TVA (DA);Total TTC (DA)\n';

		for (const inv of invoices) {
			csvContent += `"${inv.invoiceNumber}";"${inv.client?.name || ''}";"${formatDateDZ(inv.invoiceDate)}";"${formatDateDZ(inv.dueDate)}";"${inv.status}";"${inv.subtotal}";"${inv.tvaAmount}";"${inv.total}"\n`;
			const html = generateInvoiceHtml(inv, profile, stampBase64, signatureBase64);
			archive.append(html, { name: `factures/${inv.invoiceNumber.replace(/\//g, '_')}.html` });
		}

		archive.append(csvContent, { name: `recapitulatif_factures_${targetYear}.csv` });
	} else if (exportType === 'invoices' && Array.isArray(invoiceIds)) {
		let csvContent = 'Numéro;Client;Date;Échéance;Statut;Montant HT (DA);TVA (DA);Total TTC (DA)\n';

		for (const id of invoiceIds) {
			const inv = await getInvoice(locals.user.id, id);
			if (inv) {
				csvContent += `"${inv.invoiceNumber}";"${inv.client?.name || ''}";"${formatDateDZ(inv.invoiceDate)}";"${formatDateDZ(inv.dueDate)}";"${inv.status}";"${inv.subtotal}";"${inv.tvaAmount}";"${inv.total}"\n`;
				const html = generateInvoiceHtml(inv, profile, stampBase64, signatureBase64);
				archive.append(html, { name: `${inv.invoiceNumber.replace(/\//g, '_')}.html` });
			}
		}

		archive.append(csvContent, { name: `factures_export.csv` });
	} else {
		return json({ error: 'Invalid export parameters' }, { status: 400 });
	}

	archive.finalize();

	const filename =
		exportType === 'year'
			? `megaorganize-facturation-${year}.zip`
			: `megaorganize-factures-selection.zip`;

	const webStream = Readable.toWeb(passThrough) as ReadableStream;

	return new Response(webStream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
