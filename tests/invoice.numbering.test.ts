import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { invoice, invoiceClient, invoiceLine, user } from '$lib/server/db/schema';
import {
	createInvoice,
	deleteInvoice,
	getNextInvoiceNumber,
	updateInvoice,
	InvoiceNumberConflictError
} from '$lib/server/services/invoice.service';

const USER_A = 'test-user-invoice-a';
const USER_B = 'test-user-invoice-b';

async function seedUser(id: string, email: string) {
	await db.insert(user).values({ id, name: id, email, emailVerified: true }).run();
}

async function seedClient(userId: string, name: string) {
	const [client] = await db.insert(invoiceClient).values({ userId, name }).returning();
	return client;
}

function invoicePayload(clientId: string, extra: Record<string, unknown> = {}) {
	return {
		clientId,
		invoiceDate: new Date('2026-03-04T10:00:00Z'),
		dueDate: new Date('2026-03-20T10:00:00Z'),
		lines: [{ description: 'Prestation', quantity: 1, unitPrice: 1000 }],
		...extra
	};
}

describe('invoice numbering', () => {
	beforeEach(async () => {
		await db.delete(invoiceLine).run();
		await db.delete(invoice).run();
		await db.delete(invoiceClient).run();
		await db.delete(user).run();
		await seedUser(USER_A, 'a@example.com');
		await seedUser(USER_B, 'b@example.com');
	});

	it('lets two accounts own the same invoice number', async () => {
		const clientA = await seedClient(USER_A, 'Client A');
		const clientB = await seedClient(USER_B, 'Client B');

		const first = await createInvoice(USER_A, invoicePayload(clientA.id));
		const second = await createInvoice(USER_B, invoicePayload(clientB.id));

		expect(first.invoiceNumber).toBe('FAC/2026/00001');
		expect(second.invoiceNumber).toBe('FAC/2026/00001');
	});

	it('increments per account, independently of other accounts', async () => {
		const clientA = await seedClient(USER_A, 'Client A');
		const clientB = await seedClient(USER_B, 'Client B');

		await createInvoice(USER_A, invoicePayload(clientA.id));
		await createInvoice(USER_B, invoicePayload(clientB.id));
		const third = await createInvoice(USER_A, invoicePayload(clientA.id));
		const fourth = await createInvoice(USER_B, invoicePayload(clientB.id));

		expect(third.invoiceNumber).toBe('FAC/2026/00002');
		expect(fourth.invoiceNumber).toBe('FAC/2026/00002');
		expect(await getNextInvoiceNumber(USER_A, 2026)).toBe('FAC/2026/00003');
	});

	it('rejects a number the same account already used', async () => {
		const client = await seedClient(USER_A, 'Client A');
		await createInvoice(USER_A, invoicePayload(client.id, { invoiceNumber: 'FAC/2026/00042' }));

		await expect(
			createInvoice(USER_A, invoicePayload(client.id, { invoiceNumber: 'FAC/2026/00042' }))
		).rejects.toBeInstanceOf(InvoiceNumberConflictError);
	});

	it('rejects renaming an invoice onto a used number', async () => {
		const client = await seedClient(USER_A, 'Client A');
		await createInvoice(USER_A, invoicePayload(client.id, { invoiceNumber: 'FAC/2026/00001' }));
		const second = await createInvoice(
			USER_A,
			invoicePayload(client.id, { invoiceNumber: 'FAC/2026/00002' })
		);

		await expect(
			updateInvoice(USER_A, second.id, { invoiceNumber: 'FAC/2026/00001' })
		).rejects.toBeInstanceOf(InvoiceNumberConflictError);
	});

	it("refuses to bill against another account's client", async () => {
		const clientB = await seedClient(USER_B, 'Client B');

		await expect(createInvoice(USER_A, invoicePayload(clientB.id))).rejects.toThrow(
			'Client not found'
		);
	});

	it('writes the invoice and its lines atomically', async () => {
		const client = await seedClient(USER_A, 'Client A');
		const created = await createInvoice(USER_A, invoicePayload(client.id));

		expect(created.lines).toHaveLength(1);
		expect(created.total).toBe(1000);

		await deleteInvoice(USER_A, created.id);
		expect(await db.select().from(invoiceLine)).toHaveLength(0);
	});
});
