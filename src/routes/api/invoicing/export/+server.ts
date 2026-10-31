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
import { escapeHtml as esc } from '$lib/utils/html';

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
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${esc(line.description)}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${line.quantity.toFixed(2).replace('.', ',')} ${esc(line.unit)}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${esc(formatDZD(line.unitPrice).replace(' DA', ''))}</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${esc(Number(line.tvaRate).toFixed(2))}%</td>
			<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${esc(formatDZD(line.total))}</td>
		</tr>
	`
		)
		.join('');

	return `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="UTF-8">
	<title>${esc(inv.invoiceNumber)}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm 12mm; }
		* { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			color: #1f2937;
			background: #fff;
			margin: 0;
			padding: 10px;
			font-size: 12px;
			line-height: 1.4;
		}
		.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
		.brand-name { font-size: 24px; font-weight: 800; color: #111827; }
		.brand-name span { color: #4fa9b2; }
		.brand-tagline { color: #4fa9b2; font-size: 12px; font-weight: 500; margin-top: 2px; }
		.seller-info { text-align: right; font-size: 11px; color: #4b5563; line-height: 1.4; }
		.client-box { margin-top: 15px; max-width: 340px; text-align: left; font-size: 12px; color: #374151; }
		.client-label { font-size: 9px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
		.client-name { font-size: 13px; font-weight: bold; color: #111827; margin: 2px 0; }
		.client-ids { font-size: 11px; color: #4b5563; margin-top: 4px; }
		.title-bar { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 20px 0 15px; }
		.title { font-size: 22px; font-weight: 600; color: #4fa9b2; margin: 0; }
		.dates { display: flex; gap: 30px; font-size: 11px; }
		.dates div { text-align: right; }
		.dates strong { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 2px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
		th { padding: 8px 6px; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 11px; color: #374151; }
		.legal-mention { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-style: italic; color: #4b5563; margin: 8px 0 4px; }
		.tva-stamp { display: inline-block; border: 2.5px solid #dc2626; color: #dc2626; font-weight: 900; font-size: 11px; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 2px; transform: rotate(-3deg); text-transform: uppercase; user-select: none; }
		.divider { border: 0; border-top: 1px solid #e5e7eb; margin: 6px 0 16px; }
		.bottom-section { display: flex; justify-content: space-between; align-items: flex-start; }
		.conditions-box { max-width: 340px; font-size: 11px; line-height: 1.5; color: #374151; }
		.conditions-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; margin-bottom: 4px; }
		.totals-table { width: 300px; font-size: 12px; }
		.totals-table div { display: flex; justify-content: space-between; padding: 4px 0; color: #4b5563; }
		.totals-table .total-row { border-top: 2px solid #111827; color: #4fa9b2; font-size: 14px; font-weight: bold; padding-top: 6px; margin-top: 4px; }
		.words { margin-top: 10px; text-align: right; font-size: 11px; color: #4b5563; }
		.words-val { font-style: italic; color: #111827; margin-top: 2px; font-weight: 500; }
		.stamps { margin-top: 15px; display: flex; justify-content: flex-end; }
		.footer { margin-top: 25px; border-top: 1px solid #d1d5db; padding-top: 6px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<div class="brand-name">${esc(profile?.brandName || profile?.name || 'Facture')}</div>
			${profile?.brandTagline ? `<div class="brand-tagline">${esc(profile.brandTagline)}</div>` : ''}

			<div class="client-box">
				<div class="client-label">Facturé à :</div>
				<div class="client-name">${esc(inv.client.name)}</div>
				${inv.client.address ? `<div>${esc(inv.client.address)}</div>` : ''}
				<div>${esc(inv.client.city ? inv.client.city : '')}${inv.client.city && inv.client.country ? ', ' : ''}${esc(inv.client.country || '')}</div>
				<div class="client-ids">
					${inv.client.nif || inv.client.nTva ? `<div><strong>NIF :</strong> ${esc(inv.client.nif || inv.client.nTva)}</div>` : ''}
					${inv.client.nis ? `<div><strong>NIS :</strong> ${esc(inv.client.nis)}</div>` : ''}
					${inv.client.rc ? `<div><strong>RC :</strong> ${esc(inv.client.rc)}</div>` : ''}
					${inv.client.ai ? `<div><strong>AI :</strong> ${esc(inv.client.ai)}</div>` : ''}
				</div>
			</div>
		</div>

		<div class="seller-info">
			<div>NIF : ${esc(profile?.nif || '')} ${profile?.anae ? `/ ANAE : ${esc(profile.anae)}` : ''}</div>
			<div style="font-weight: bold; color: #111827; font-size: 12px; margin-top: 2px;">${esc(profile?.name || '')}</div>
			<div>${esc(profile?.address || '')}</div>
			<div>${esc(profile?.phone || '')} ${profile?.email ? `• ${esc(profile.email)}` : ''}</div>
			${profile?.rib ? `<div style="font-family: monospace; margin-top: 2px;"><strong>RIB :</strong> ${esc(profile.rib)}</div>` : ''}
		</div>
	</div>

	<div class="title-bar">
		<div class="title">Facture ${esc(inv.invoiceNumber)}</div>
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

	<hr class="divider" />

	<div class="bottom-section">
		<div class="conditions-box">
			<div class="conditions-title">Conditions & Règlement</div>
			<div><strong>Mode de règlement :</strong> ${esc(inv.paymentMode || 'Virement bancaire / Chèque')}</div>
			<div><strong>Conditions de paiement :</strong> ${esc(inv.paymentConditions || '30% au démarrage, le solde à la livraison')}</div>
			<div><strong>Communication :</strong> ${esc(inv.invoiceNumber)}</div>
			${profile?.rib ? `<div style="font-family: monospace; margin-top: 4px;"><strong>RIB / RIP :</strong> ${esc(profile.rib)}</div>` : ''}
			${inv.notes ? `<div style="margin-top: 4px; color: #6b7280; font-style: italic;">${esc(inv.notes)}</div>` : ''}
		</div>

		<div class="totals-table">
			<div>
				<span>Montant hors taxes</span>
				<span>${formatDZD(inv.subtotal)}</span>
			</div>
			<div>
				<span>TVA (0% - Exonéré IFU)</span>
				<span>0,00 DA</span>
			</div>
			<div class="total-row">
				<span>Total Net à Payer</span>
				<span>${formatDZD(inv.total)}</span>
			</div>
			<div class="words">
				Montant total en toutes lettres :
				<div class="words-val">${esc(totalWords)}</div>
			</div>

			<div class="stamps" style="margin-top: 15px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
				${(inv.showTvaStamp ?? inv.tvaAmount === 0) ? '<div class="tva-stamp">NON SOUMIS À LA TVA</div>' : ''}
				<div style="position: relative; width: 190px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
					${stampBase64 ? `<img src="${stampBase64}" alt="Cachet" style="max-height: 90px; max-width: 100%; object-fit: contain;" />` : ''}
					${signatureBase64 ? `<img src="${signatureBase64}" alt="Signature" style="position: absolute; inset: 0; margin: auto; max-height: 75px; max-width: 100%; object-fit: contain; opacity: 0.95;" />` : ''}
					${!stampBase64 && !signatureBase64 ? `<div style="border: 1px dashed #d1d5db; padding: 15px; font-size: 11px; color: #9ca3af; border-radius: 4px;">Cachet et Signature</div>` : ''}
				</div>
			</div>
		</div>
	</div>

	<div class="footer">
		<div>${esc(profile?.phone || '')} ${profile?.email ? `• ${esc(profile.email)}` : ''}</div>
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
