import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	invoiceClient,
	invoiceProduct,
	invoice,
	invoiceLine,
	invoiceYearlyDoc
} from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'data/uploads');

function getInvoicingDir(userId: string) {
	return path.join(UPLOAD_DIR, userId, 'invoicing');
}

function getTaxesDir(userId: string) {
	return path.join(getInvoicingDir(userId), 'taxes');
}

// ─── Clients ────────────────────────────────────────────────────────────────

export async function getClients(userId: string) {
	return db.query.invoiceClient.findMany({
		where: eq(invoiceClient.userId, userId),
		orderBy: [asc(invoiceClient.name)]
	});
}

export async function getClient(userId: string, clientId: string) {
	return db.query.invoiceClient.findFirst({
		where: and(eq(invoiceClient.id, clientId), eq(invoiceClient.userId, userId))
	});
}

export async function createClient(
	userId: string,
	data: {
		name: string;
		address?: string | null;
		city?: string | null;
		wilaya?: string | null;
		country?: string | null;
		nif?: string | null;
		nis?: string | null;
		rc?: string | null;
		ai?: string | null;
		nTva?: string | null;
		phone?: string | null;
		email?: string | null;
	}
) {
	const [row] = await db
		.insert(invoiceClient)
		.values({
			userId,
			name: data.name.trim(),
			address: data.address?.trim() || null,
			city: data.city?.trim() || null,
			wilaya: data.wilaya?.trim() || null,
			country: data.country?.trim() || 'Algérie',
			nif: data.nif?.trim() || null,
			nis: data.nis?.trim() || null,
			rc: data.rc?.trim() || null,
			ai: data.ai?.trim() || null,
			nTva: data.nTva?.trim() || null,
			phone: data.phone?.trim() || null,
			email: data.email?.trim() || null
		})
		.returning();
	return row;
}

export async function updateClient(
	userId: string,
	clientId: string,
	data: Partial<{
		name: string;
		address: string | null;
		city: string | null;
		wilaya: string | null;
		country: string | null;
		nif: string | null;
		nis: string | null;
		rc: string | null;
		ai: string | null;
		nTva: string | null;
		phone: string | null;
		email: string | null;
	}>
) {
	const updateData: Record<string, unknown> = {};
	if (data.name !== undefined) updateData.name = data.name.trim();
	if (data.address !== undefined) updateData.address = data.address?.trim() || null;
	if (data.city !== undefined) updateData.city = data.city?.trim() || null;
	if (data.wilaya !== undefined) updateData.wilaya = data.wilaya?.trim() || null;
	if (data.country !== undefined) updateData.country = data.country?.trim() || 'Algérie';
	if (data.nif !== undefined) updateData.nif = data.nif?.trim() || null;
	if (data.nis !== undefined) updateData.nis = data.nis?.trim() || null;
	if (data.rc !== undefined) updateData.rc = data.rc?.trim() || null;
	if (data.ai !== undefined) updateData.ai = data.ai?.trim() || null;
	if (data.nTva !== undefined) updateData.nTva = data.nTva?.trim() || null;
	if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
	if (data.email !== undefined) updateData.email = data.email?.trim() || null;

	const [row] = await db
		.update(invoiceClient)
		.set(updateData)
		.where(and(eq(invoiceClient.id, clientId), eq(invoiceClient.userId, userId)))
		.returning();
	return row;
}

export async function deleteClient(userId: string, clientId: string) {
	const count = await db
		.select({ count: sql<number>`count(*)` })
		.from(invoice)
		.where(and(eq(invoice.clientId, clientId), eq(invoice.userId, userId)));

	if ((count[0]?.count ?? 0) > 0) {
		throw new Error('Cannot delete a client with associated invoices');
	}

	await db
		.delete(invoiceClient)
		.where(and(eq(invoiceClient.id, clientId), eq(invoiceClient.userId, userId)));
}

// ─── Products & Services ───────────────────────────────────────────────────

export async function getProducts(userId: string) {
	return db.query.invoiceProduct.findMany({
		where: eq(invoiceProduct.userId, userId),
		orderBy: [asc(invoiceProduct.name)]
	});
}

export async function getProduct(userId: string, productId: string) {
	return db.query.invoiceProduct.findFirst({
		where: and(eq(invoiceProduct.id, productId), eq(invoiceProduct.userId, userId))
	});
}

export async function createProduct(
	userId: string,
	data: {
		name: string;
		description?: string | null;
		unitPrice: number;
		unit?: string | null;
		tvaRate?: number;
	}
) {
	const [row] = await db
		.insert(invoiceProduct)
		.values({
			userId,
			name: data.name.trim(),
			description: data.description?.trim() || null,
			unitPrice: Number(data.unitPrice) || 0,
			unit: data.unit?.trim() || 'Unité(s)',
			tvaRate: Number(data.tvaRate) || 0
		})
		.returning();
	return row;
}

export async function updateProduct(
	userId: string,
	productId: string,
	data: Partial<{
		name: string;
		description: string | null;
		unitPrice: number;
		unit: string;
		tvaRate: number;
	}>
) {
	const updateData: Record<string, unknown> = {};
	if (data.name !== undefined) updateData.name = data.name.trim();
	if (data.description !== undefined) updateData.description = data.description?.trim() || null;
	if (data.unitPrice !== undefined) updateData.unitPrice = Number(data.unitPrice) || 0;
	if (data.unit !== undefined) updateData.unit = data.unit.trim();
	if (data.tvaRate !== undefined) updateData.tvaRate = Number(data.tvaRate) || 0;

	const [row] = await db
		.update(invoiceProduct)
		.set(updateData)
		.where(and(eq(invoiceProduct.id, productId), eq(invoiceProduct.userId, userId)))
		.returning();
	return row;
}

export async function deleteProduct(userId: string, productId: string) {
	await db
		.delete(invoiceProduct)
		.where(and(eq(invoiceProduct.id, productId), eq(invoiceProduct.userId, userId)));
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export async function getInvoices(userId: string, year?: number, status?: string) {
	const conditions = [eq(invoice.userId, userId)];
	if (year) conditions.push(eq(invoice.year, year));
	if (status)
		conditions.push(eq(invoice.status, status as 'draft' | 'sent' | 'paid' | 'cancelled'));

	return db.query.invoice.findMany({
		where: and(...conditions),
		orderBy: [desc(invoice.invoiceDate), desc(invoice.createdAt)],
		with: {
			client: true,
			lines: {
				orderBy: [asc(invoiceLine.position)]
			}
		}
	});
}

export async function getInvoice(userId: string, invoiceId: string) {
	return db.query.invoice.findFirst({
		where: and(eq(invoice.id, invoiceId), eq(invoice.userId, userId)),
		with: {
			client: true,
			lines: {
				orderBy: [asc(invoiceLine.position)]
			}
		}
	});
}

export async function getInvoiceYears(userId: string): Promise<number[]> {
	const rows = await db
		.selectDistinct({ year: invoice.year })
		.from(invoice)
		.where(eq(invoice.userId, userId))
		.orderBy(desc(invoice.year));

	const years = rows.map((r) => r.year);
	const currentYear = new Date().getFullYear();
	if (!years.includes(currentYear)) {
		years.unshift(currentYear);
	}
	return years.sort((a, b) => b - a);
}

export async function getNextInvoiceNumber(
	userId: string,
	year: number,
	executor: DbExecutor = db
): Promise<string> {
	// Find all invoice numbers for this year to find highest sequential number
	const rows = await executor
		.select({ invoiceNumber: invoice.invoiceNumber })
		.from(invoice)
		.where(and(eq(invoice.userId, userId), eq(invoice.year, year)));

	let maxSeq = 0;
	const prefix = `FAC/${year}/`;
	for (const row of rows) {
		if (row.invoiceNumber.startsWith(prefix)) {
			const numPart = parseInt(row.invoiceNumber.slice(prefix.length), 10);
			if (!isNaN(numPart) && numPart > maxSeq) {
				maxSeq = numPart;
			}
		}
	}

	const nextSeq = maxSeq + 1;
	return `FAC/${year}/${String(nextSeq).padStart(5, '0')}`;
}

export interface InvoiceLineInput {
	productId?: string | null;
	description: string;
	quantity: number;
	unitPrice: number;
	unit?: string;
	tvaRate?: number;
	position?: number;
}

/** Thrown when an invoice number is already used by another invoice of the
 * same account. Callers translate it into a 409 instead of leaking SQL. */
export class InvoiceNumberConflictError extends Error {
	constructor(invoiceNumber: string) {
		super(`Invoice number ${invoiceNumber} is already used`);
		this.name = 'InvoiceNumberConflictError';
	}
}

function isUniqueViolation(error: unknown): boolean {
	// Drizzle wraps driver errors in a DrizzleQueryError whose message is the
	// SQL text; the UNIQUE text and the SQLite code live on the cause chain.
	let current: unknown = error;
	for (let depth = 0; current && depth < 5; depth++) {
		const candidate = current as {
			message?: string;
			code?: string;
			extendedCode?: string;
			cause?: unknown;
		};
		const message = candidate.message ?? '';
		if (
			message.includes('UNIQUE constraint failed') ||
			message.includes('SQLITE_CONSTRAINT_UNIQUE') ||
			candidate.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
			candidate.extendedCode === 'SQLITE_CONSTRAINT_UNIQUE'
		) {
			return true;
		}
		current = candidate.cause;
	}
	return false;
}

export async function createInvoice(
	userId: string,
	data: {
		clientId: string;
		invoiceNumber?: string;
		invoiceDate: Date | string | number;
		dueDate: Date | string | number;
		status?: 'draft' | 'sent' | 'paid' | 'cancelled';
		paymentMode?: string | null;
		paymentConditions?: string | null;
		notes?: string | null;
		showTvaStamp?: boolean;
		lines: InvoiceLineInput[];
	}
) {
	// The client must belong to the caller: a forged clientId would otherwise
	// let one account bill against another account's client record.
	const client = await db.query.invoiceClient.findFirst({
		where: and(eq(invoiceClient.id, data.clientId), eq(invoiceClient.userId, userId)),
		columns: { id: true }
	});
	if (!client) throw new Error('Client not found');

	const invDate = new Date(data.invoiceDate);
	const dueDate = new Date(data.dueDate);
	const year = invDate.getFullYear();

	let subtotal = 0;
	let tvaAmount = 0;

	const preparedLines = data.lines.map((line, idx) => {
		const qty = Number(line.quantity) || 1;
		const price = Number(line.unitPrice) || 0;
		const tva = Number(line.tvaRate) || 0;
		const lineTotal = qty * price;
		const lineTva = lineTotal * (tva / 100);

		subtotal += lineTotal;
		tvaAmount += lineTva;

		return {
			productId: line.productId || null,
			description: line.description.trim(),
			quantity: qty,
			unitPrice: price,
			unit: line.unit?.trim() || 'Unité(s)',
			tvaRate: tva,
			total: lineTotal,
			position: line.position ?? idx
		};
	});

	const total = subtotal + tvaAmount;

	// Two accounts may hold the same number (the unique index is per user),
	// but one account may not. When the caller did not pick a number, a
	// concurrent insert can still grab the one we computed: retry with the
	// next free number instead of failing the request.
	const explicitNumber = data.invoiceNumber?.trim() || null;
	const attempts = explicitNumber ? 1 : 5;
	let createdInvoice: typeof invoice.$inferSelect | undefined;

	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			createdInvoice = await db.transaction(async (tx) => {
				const invoiceNumber = explicitNumber ?? (await getNextInvoiceNumber(userId, year, tx));

				const [inserted] = await tx
					.insert(invoice)
					.values({
						userId,
						clientId: data.clientId,
						invoiceNumber,
						invoiceDate: invDate,
						dueDate,
						status: data.status || 'draft',
						paymentMode: data.paymentMode?.trim() || 'Virement bancaire / Chèque',
						paymentConditions:
							data.paymentConditions?.trim() || '30% au démarrage, le solde à la livraison',
						notes: data.notes?.trim() || null,
						showTvaStamp: data.showTvaStamp !== undefined ? data.showTvaStamp : tvaAmount === 0,
						subtotal,
						tvaAmount,
						total,
						year
					})
					.returning();

				if (preparedLines.length > 0) {
					await tx.insert(invoiceLine).values(
						preparedLines.map((line) => ({
							invoiceId: inserted.id,
							...line
						}))
					);
				}

				return inserted;
			});
			break;
		} catch (error) {
			if (!isUniqueViolation(error)) throw error;
			if (explicitNumber) throw new InvoiceNumberConflictError(explicitNumber);
			if (attempt === attempts - 1) throw new InvoiceNumberConflictError(`FAC/${year}/…`);
		}
	}

	if (!createdInvoice) throw new Error('Failed to create invoice');
	return getInvoice(userId, createdInvoice.id);
}

export async function updateInvoice(
	userId: string,
	invoiceId: string,
	data: {
		clientId?: string;
		invoiceNumber?: string;
		invoiceDate?: Date | string | number;
		dueDate?: Date | string | number;
		status?: 'draft' | 'sent' | 'paid' | 'cancelled';
		paymentMode?: string | null;
		paymentConditions?: string | null;
		notes?: string | null;
		showTvaStamp?: boolean;
		lines?: InvoiceLineInput[];
	}
) {
	const existing = await getInvoice(userId, invoiceId);
	if (!existing) throw new Error('Invoice not found');

	if (data.clientId) {
		const client = await db.query.invoiceClient.findFirst({
			where: and(eq(invoiceClient.id, data.clientId), eq(invoiceClient.userId, userId)),
			columns: { id: true }
		});
		if (!client) throw new Error('Client not found');
	}

	const updateData: Record<string, unknown> = {};

	if (data.clientId) updateData.clientId = data.clientId;
	if (data.invoiceNumber) updateData.invoiceNumber = data.invoiceNumber;
	if (data.invoiceDate) {
		const d = new Date(data.invoiceDate);
		updateData.invoiceDate = d;
		updateData.year = d.getFullYear();
	}
	if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
	if (data.status) updateData.status = data.status;
	if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode?.trim() || null;
	if (data.paymentConditions !== undefined)
		updateData.paymentConditions = data.paymentConditions?.trim() || null;
	if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
	if (data.showTvaStamp !== undefined) updateData.showTvaStamp = data.showTvaStamp;

	if (data.lines) {
		await db.delete(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId));

		let subtotal = 0;
		let tvaAmount = 0;

		const preparedLines = data.lines.map((line, idx) => {
			const qty = Number(line.quantity) || 1;
			const price = Number(line.unitPrice) || 0;
			const tva = Number(line.tvaRate) || 0;
			const lineTotal = qty * price;
			const lineTva = lineTotal * (tva / 100);

			subtotal += lineTotal;
			tvaAmount += lineTva;

			return {
				invoiceId,
				productId: line.productId || null,
				description: line.description.trim(),
				quantity: qty,
				unitPrice: price,
				unit: line.unit?.trim() || 'Unité(s)',
				tvaRate: tva,
				total: lineTotal,
				position: line.position ?? idx
			};
		});

		updateData.subtotal = subtotal;
		updateData.tvaAmount = tvaAmount;
		updateData.total = subtotal + tvaAmount;

		if (preparedLines.length > 0) {
			await db.insert(invoiceLine).values(preparedLines);
		}
	}

	if (Object.keys(updateData).length > 0) {
		try {
			await db
				.update(invoice)
				.set(updateData)
				.where(and(eq(invoice.id, invoiceId), eq(invoice.userId, userId)));
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new InvoiceNumberConflictError(String(data.invoiceNumber ?? ''));
			}
			throw error;
		}
	}

	return getInvoice(userId, invoiceId);
}

export async function deleteInvoice(userId: string, invoiceId: string) {
	await db.delete(invoice).where(and(eq(invoice.id, invoiceId), eq(invoice.userId, userId)));
}

// ─── Yearly Documents (G12 & G12 bis) ───────────────────────────────────────

export async function getYearlyDocs(userId: string, year: number) {
	return db.query.invoiceYearlyDoc.findMany({
		where: and(eq(invoiceYearlyDoc.userId, userId), eq(invoiceYearlyDoc.year, year)),
		orderBy: [desc(invoiceYearlyDoc.createdAt)]
	});
}

export async function getYearlyDocById(userId: string, docId: string) {
	return db.query.invoiceYearlyDoc.findFirst({
		where: and(eq(invoiceYearlyDoc.id, docId), eq(invoiceYearlyDoc.userId, userId))
	});
}

export async function saveYearlyDocFile(
	userId: string,
	year: number,
	docType: 'g12' | 'g12_bis',
	file: File
) {
	const dir = getTaxesDir(userId);
	await mkdir(dir, { recursive: true });

	const ext = path.extname(file.name).toLowerCase() || '.pdf';
	const storedName = `${docType}_${year}_${crypto.randomUUID()}${ext}`;
	const filePath = path.resolve(dir, storedName);

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);

	// Check if there is already a doc of this type for this year, and replace it or add new
	const existing = await db.query.invoiceYearlyDoc.findFirst({
		where: and(
			eq(invoiceYearlyDoc.userId, userId),
			eq(invoiceYearlyDoc.year, year),
			eq(invoiceYearlyDoc.docType, docType)
		)
	});

	if (existing) {
		// Remove old file from taxes or invoicing dir
		for (const d of [dir, getInvoicingDir(userId)]) {
			const oldPath = path.resolve(d, existing.storedName);
			try {
				await unlink(oldPath);
			} catch {
				// ignore if already gone
			}
		}
		const [updated] = await db
			.update(invoiceYearlyDoc)
			.set({
				originalName: file.name,
				storedName,
				mimeType: file.type || 'application/pdf',
				size: file.size
			})
			.where(eq(invoiceYearlyDoc.id, existing.id))
			.returning();
		return updated;
	}

	const [created] = await db
		.insert(invoiceYearlyDoc)
		.values({
			userId,
			year,
			docType,
			originalName: file.name,
			storedName,
			mimeType: file.type || 'application/pdf',
			size: file.size
		})
		.returning();

	return created;
}

export async function getYearlyDocFilePath(userId: string, storedName: string) {
	for (const dir of [getTaxesDir(userId), getInvoicingDir(userId)]) {
		const filePath = path.resolve(dir, storedName);
		if (filePath.startsWith(path.resolve(dir))) {
			try {
				await stat(filePath);
				return filePath;
			} catch {
				// continue
			}
		}
	}
	return null;
}

export async function deleteYearlyDoc(userId: string, docId: string) {
	const doc = await getYearlyDocById(userId, docId);
	if (!doc) return false;

	for (const dir of [getTaxesDir(userId), getInvoicingDir(userId)]) {
		const filePath = path.resolve(dir, doc.storedName);
		try {
			await unlink(filePath);
		} catch {
			// ignore
		}
	}

	await db
		.delete(invoiceYearlyDoc)
		.where(and(eq(invoiceYearlyDoc.id, docId), eq(invoiceYearlyDoc.userId, userId)));
	return true;
}

// ─── User Profile & Signature/Stamp ─────────────────────────────────────────

export async function getUserInvoiceProfile(userId: string) {
	const u = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});
	if (!u) return null;
	return {
		id: u.id,
		name: u.name,
		email: u.email,
		image: u.image,
		signatureUrl: u.signatureUrl,
		stampUrl: u.stampUrl,
		brandName: u.brandName || '',
		brandTagline: u.brandTagline || '',
		address: u.address || '',
		phone: u.phone || '',
		nif: u.nif || '',
		anae: u.anae || '',
		rc: u.rc || '',
		nis: u.nis || '',
		ai: u.ai || '',
		rib: u.rib || ''
	};
}

export async function updateUserInvoiceProfile(
	userId: string,
	data: {
		brandName?: string | null;
		brandTagline?: string | null;
		address?: string | null;
		phone?: string | null;
		nif?: string | null;
		anae?: string | null;
		rc?: string | null;
		nis?: string | null;
		ai?: string | null;
		rib?: string | null;
	}
) {
	const [updated] = await db.update(user).set(data).where(eq(user.id, userId)).returning();
	return updated;
}

/** Signature and stamp images are shown inside invoices: accept raster images
 * only, verify the bytes match the declared format, and cap the size. SVG is
 * rejected on purpose — it can carry script and the file is served inline. */
const MEDIA_MAX_SIZE = 2 * 1024 * 1024;

function detectImageType(data: Buffer): { ext: '.png' | '.jpg' | '.webp'; mime: string } | null {
	if (
		data.length > 8 &&
		data[0] === 0x89 &&
		data[1] === 0x50 &&
		data[2] === 0x4e &&
		data[3] === 0x47 &&
		data[4] === 0x0d &&
		data[5] === 0x0a &&
		data[6] === 0x1a &&
		data[7] === 0x0a
	) {
		return { ext: '.png', mime: 'image/png' };
	}
	if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
		return { ext: '.jpg', mime: 'image/jpeg' };
	}
	if (
		data.length > 12 &&
		data.subarray(0, 4).toString('ascii') === 'RIFF' &&
		data.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return { ext: '.webp', mime: 'image/webp' };
	}
	return null;
}

export async function saveUserMediaFile(userId: string, type: 'signature' | 'stamp', file: File) {
	if (file.size > MEDIA_MAX_SIZE) {
		throw new Error('Image must be smaller than 2MB');
	}

	const data = Buffer.from(await file.arrayBuffer());
	const detected = detectImageType(data);
	if (!detected) {
		throw new Error('Image must be a PNG, JPEG, or WebP file');
	}

	const dir = getInvoicingDir(userId);
	await mkdir(dir, { recursive: true });

	// Deterministic name: replacing the signature leaves one file behind
	// instead of an ever-growing set of orphaned uploads, and the lookup
	// below never has to guess which file is current.
	const storedName = `${type}${detected.ext}`;
	const filePath = path.resolve(dir, storedName);
	if (!filePath.startsWith(path.resolve(dir) + path.sep)) {
		throw new Error('Invalid file path');
	}

	// Drop previous uploads for this slot (other extensions, legacy UUID names).
	const { readdir } = await import('fs/promises');
	for (const name of await readdir(dir).catch(() => [] as string[])) {
		if (
			name !== storedName &&
			(name === type || name.startsWith(`${type}_`) || name.startsWith(`${type}.`))
		) {
			await unlink(path.join(dir, name)).catch(() => {});
		}
	}

	await writeFile(filePath, data);

	const relativeUrl = `/api/invoicing/user-media?type=${type}&t=${Date.now()}`;

	if (type === 'signature') {
		await db.update(user).set({ signatureUrl: relativeUrl }).where(eq(user.id, userId));
	} else {
		await db.update(user).set({ stampUrl: relativeUrl }).where(eq(user.id, userId));
	}

	return { url: relativeUrl, storedName };
}

export async function getUserMediaFilePath(userId: string, type: 'signature' | 'stamp') {
	const dir = getInvoicingDir(userId);
	try {
		const { readdir, stat } = await import('fs/promises');
		const files = await readdir(dir);
		const candidates = files.filter(
			(f) => f === type || f.startsWith(`${type}_`) || f.startsWith(`${type}.`)
		);
		if (candidates.length === 0) return null;
		if (candidates.length === 1) return path.join(dir, candidates[0]);

		// Legacy directories can hold several uploads per slot: use the newest.
		const stats = await Promise.all(
			candidates.map(async (name) => ({ name, mtime: (await stat(path.join(dir, name))).mtimeMs }))
		);
		stats.sort((a, b) => b.mtime - a.mtime);
		return path.join(dir, stats[0].name);
	} catch {
		return null;
	}
}

// ─── Formatting & Algerian Law Compliance ───────────────────────────────────

export { formatDZD, formatDateDZ, numberToFrenchWords } from '$lib/utils/invoice';
