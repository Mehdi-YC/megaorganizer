import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getInvoices,
	getInvoice,
	createInvoice,
	updateInvoice,
	deleteInvoice,
	getNextInvoiceNumber,
	InvoiceNumberConflictError
} from '$lib/server/services/invoice.service';

/**
 * Map service errors to HTTP responses. Only errors we raise ourselves are
 * echoed: raw SQLite/drizzle messages leak table and column details.
 */
function invoiceErrorResponse(error: unknown, fallback: string) {
	if (error instanceof InvoiceNumberConflictError) {
		return json({ error: error.message }, { status: 409 });
	}
	if (error instanceof Error && error.message === 'Client not found') {
		return json({ error: 'Client not found' }, { status: 404 });
	}
	console.error(fallback, error);
	return json({ error: fallback }, { status: 500 });
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	if (id) {
		const inv = await getInvoice(locals.user.id, id);
		if (!inv) return json({ error: 'Invoice not found' }, { status: 404 });
		return json(inv);
	}

	const nextNumber = url.searchParams.get('nextNumber');
	if (nextNumber) {
		const year = parseInt(nextNumber, 10) || new Date().getFullYear();
		const num = await getNextInvoiceNumber(locals.user.id, year);
		return json({ invoiceNumber: num });
	}

	const yearParam = url.searchParams.get('year');
	const year = yearParam ? parseInt(yearParam, 10) : undefined;
	const status = url.searchParams.get('status') || undefined;

	const invoices = await getInvoices(locals.user.id, year, status);
	return json(invoices);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.clientId) {
			return json({ error: 'Client is required' }, { status: 400 });
		}
		if (!body.invoiceDate) {
			return json({ error: 'Invoice date is required' }, { status: 400 });
		}
		if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
			return json({ error: 'At least one line item is required' }, { status: 400 });
		}

		const invoice = await createInvoice(locals.user.id, {
			clientId: body.clientId,
			invoiceNumber: body.invoiceNumber || undefined,
			invoiceDate: body.invoiceDate,
			dueDate: body.dueDate || body.invoiceDate,
			status: body.status || 'draft',
			paymentMode: body.paymentMode,
			paymentConditions: body.paymentConditions,
			notes: body.notes || null,
			showTvaStamp: body.showTvaStamp,
			lines: body.lines
		});

		return json(invoice, { status: 201 });
	} catch (e: unknown) {
		return invoiceErrorResponse(e, 'Failed to create invoice');
	}
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.id) {
			return json({ error: 'Invoice id is required' }, { status: 400 });
		}

		const invoice = await updateInvoice(locals.user.id, body.id, {
			clientId: body.clientId,
			invoiceNumber: body.invoiceNumber,
			invoiceDate: body.invoiceDate,
			dueDate: body.dueDate,
			status: body.status,
			paymentMode: body.paymentMode,
			paymentConditions: body.paymentConditions,
			notes: body.notes,
			showTvaStamp: body.showTvaStamp,
			lines: body.lines
		});

		return json(invoice);
	} catch (e: unknown) {
		return invoiceErrorResponse(e, 'Failed to update invoice');
	}
};

export const DELETE: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const id = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id;
		if (!id) return json({ error: 'Invoice id is required' }, { status: 400 });

		await deleteInvoice(locals.user.id, id);
		return json({ success: true });
	} catch (e: unknown) {
		return invoiceErrorResponse(e, 'Failed to delete invoice');
	}
};
