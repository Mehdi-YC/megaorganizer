import { getTagsByUser } from '$lib/server/services/tag.service';
import { updatePage as updatePageRecord } from '$lib/server/services/page.service';
import { updateTreeElement } from '$lib/server/services/tree.service';
import {
	createClient as createClientService,
	updateClient as updateClientService,
	createProduct as createProductService,
	updateProduct as updateProductService,
	createInvoice as createInvoiceService,
	updateInvoice as updateInvoiceService,
	getClient as getClientService,
	getProduct as getProductService,
	getInvoice as getInvoiceService,
	type InvoiceLineInput
} from '$lib/server/services/invoice.service';
import { getItem, getPage, ToolInputError } from './queries';

// Write operations behind the MCP edit tools. Like the read queries, every
// function takes the user id resolved from the bearer token, and the services
// it calls scope their UPDATE by that id, so a token can never touch another
// account's rows.

export interface UpdateItemArgs {
	id: string;
	name?: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	videoUrl?: string | null;
	externalUrl?: string | null;
	tags?: string[];
	favorite?: boolean;
}

export interface UpdatePageArgs {
	id: string;
	name?: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	coverImageUrl?: string | null;
	icon?: string | null;
}

/** An omitted field stays untouched; null or "" clears a nullable field. */
function cleanText(value: string | null | undefined): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;
	return value.trim().length > 0 ? value : null;
}

function cleanName(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const name = value.trim();
	if (!name) throw new ToolInputError('"name" cannot be empty.');
	return name;
}

/** Only public http(s) URLs are accepted, matching what the app can render. */
function cleanUrl(value: string | null | undefined, field: string): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null || value.trim() === '') return null;
	const candidate = value.trim();
	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		throw new ToolInputError(`"${field}" must be a full http(s) URL.`);
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new ToolInputError(`"${field}" must use http or https.`);
	}
	return candidate;
}

/**
 * Tags are stored as JSON ids. The caller may pass ids or names (the same
 * convenience list_* tools use); unknown tags are an error instead of being
 * created silently, so a typo cannot spawn a duplicate tag.
 */
async function resolveTagIds(userId: string, values: string[]): Promise<string[]> {
	const tags = await getTagsByUser(userId);
	const byId = new Map(tags.map((row) => [row.id, row]));
	const byName = new Map(tags.map((row) => [row.name.toLowerCase(), row]));

	const ids = new Set<string>();
	const unknown: string[] = [];
	for (const raw of values) {
		const value = raw.trim();
		const match = byId.get(value) ?? byName.get(value.toLowerCase());
		if (match) ids.add(match.id);
		else unknown.push(value);
	}

	if (unknown.length > 0) {
		throw new ToolInputError(
			`Unknown tag${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Use list_tags to see the available tags.`
		);
	}
	return [...ids];
}

export async function updateItem(userId: string, args: UpdateItemArgs) {
	const patch: Parameters<typeof updateTreeElement>[2] = {};

	const name = cleanName(args.name);
	if (name !== undefined) patch.name = name;
	const description = cleanText(args.description);
	if (description !== undefined) patch.description = description;
	const markdown = cleanText(args.markdown);
	if (markdown !== undefined) patch.markdown = markdown;
	const imageUrl = cleanUrl(args.imageUrl, 'imageUrl');
	if (imageUrl !== undefined) patch.imageUrl = imageUrl;
	const videoUrl = cleanUrl(args.videoUrl, 'videoUrl');
	if (videoUrl !== undefined) patch.videoUrl = videoUrl;
	const externalUrl = cleanUrl(args.externalUrl, 'externalUrl');
	if (externalUrl !== undefined) patch.externalUrl = externalUrl;
	if (args.tags !== undefined) patch.tags = JSON.stringify(await resolveTagIds(userId, args.tags));
	if (args.favorite !== undefined) patch.favorite = args.favorite;

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one field to update.');
	}

	const element = await updateTreeElement(userId, args.id, patch);
	if (!element) throw new ToolInputError(`No item or node with id "${args.id}".`);

	const detail = await getItem(userId, args.id, 1);
	return { changed, item: detail.item };
}

export async function updatePage(userId: string, args: UpdatePageArgs) {
	const patch: Parameters<typeof updatePageRecord>[2] = {};

	const name = cleanName(args.name);
	if (name !== undefined) patch.name = name;
	const description = cleanText(args.description);
	if (description !== undefined) patch.description = description;
	const markdown = cleanText(args.markdown);
	if (markdown !== undefined) patch.markdown = markdown;
	const imageUrl = cleanUrl(args.imageUrl, 'imageUrl');
	if (imageUrl !== undefined) patch.imageUrl = imageUrl;
	const coverImageUrl = cleanUrl(args.coverImageUrl, 'coverImageUrl');
	if (coverImageUrl !== undefined) patch.coverImageUrl = coverImageUrl;
	const icon = cleanText(args.icon);
	if (icon !== undefined) patch.icon = icon;

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one field to update.');
	}

	const row = await updatePageRecord(userId, args.id, patch);
	if (!row) throw new ToolInputError(`No page with id "${args.id}".`);

	const detail = await getPage(userId, args.id, 1);
	return { changed, page: detail.page };
}

// ─── Invoicing Mutations (Clients, Products, Invoices) ───────────────────────

export interface CreateClientArgs {
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

export interface UpdateClientArgs {
	id: string;
	name?: string;
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

export async function createClient(userId: string, args: CreateClientArgs) {
	const name = cleanName(args.name);
	if (!name) throw new ToolInputError('"name" is required for a client.');

	const client = await createClientService(userId, {
		name,
		address: cleanText(args.address),
		city: cleanText(args.city),
		wilaya: cleanText(args.wilaya),
		country: cleanText(args.country) ?? 'Algérie',
		nif: cleanText(args.nif),
		nis: cleanText(args.nis),
		rc: cleanText(args.rc),
		ai: cleanText(args.ai),
		nTva: cleanText(args.nTva),
		phone: cleanText(args.phone),
		email: cleanText(args.email)
	});

	return { client };
}

export async function updateClient(userId: string, args: UpdateClientArgs) {
	const existing = await getClientService(userId, args.id);
	if (!existing) throw new ToolInputError(`No client found with id "${args.id}".`);

	const patch: Parameters<typeof updateClientService>[2] = {};
	if (args.name !== undefined) patch.name = cleanName(args.name);
	if (args.address !== undefined) patch.address = cleanText(args.address) ?? null;
	if (args.city !== undefined) patch.city = cleanText(args.city) ?? null;
	if (args.wilaya !== undefined) patch.wilaya = cleanText(args.wilaya) ?? null;
	if (args.country !== undefined) patch.country = cleanText(args.country) ?? null;
	if (args.nif !== undefined) patch.nif = cleanText(args.nif) ?? null;
	if (args.nis !== undefined) patch.nis = cleanText(args.nis) ?? null;
	if (args.rc !== undefined) patch.rc = cleanText(args.rc) ?? null;
	if (args.ai !== undefined) patch.ai = cleanText(args.ai) ?? null;
	if (args.nTva !== undefined) patch.nTva = cleanText(args.nTva) ?? null;
	if (args.phone !== undefined) patch.phone = cleanText(args.phone) ?? null;
	if (args.email !== undefined) patch.email = cleanText(args.email) ?? null;

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one client field to update.');
	}

	const updated = await updateClientService(userId, args.id, patch);
	return { changed, client: updated };
}

export interface CreateProductArgs {
	name: string;
	description?: string | null;
	unitPrice: number;
	unit?: string | null;
	tvaRate?: number;
}

export interface UpdateProductArgs {
	id: string;
	name?: string;
	description?: string | null;
	unitPrice?: number;
	unit?: string;
	tvaRate?: number;
}

export async function createProduct(userId: string, args: CreateProductArgs) {
	const name = cleanName(args.name);
	if (!name) throw new ToolInputError('"name" is required for a product.');
	if (typeof args.unitPrice !== 'number' || isNaN(args.unitPrice) || args.unitPrice < 0) {
		throw new ToolInputError('"unitPrice" must be a non-negative number.');
	}

	const product = await createProductService(userId, {
		name,
		description: cleanText(args.description),
		unitPrice: args.unitPrice,
		unit: cleanText(args.unit) ?? 'Unité(s)',
		tvaRate: args.tvaRate ?? 0
	});

	return { product };
}

export async function updateProduct(userId: string, args: UpdateProductArgs) {
	const existing = await getProductService(userId, args.id);
	if (!existing) throw new ToolInputError(`No product found with id "${args.id}".`);

	const patch: Parameters<typeof updateProductService>[2] = {};
	if (args.name !== undefined) patch.name = cleanName(args.name);
	if (args.description !== undefined) patch.description = cleanText(args.description) ?? null;
	if (args.unitPrice !== undefined) {
		if (typeof args.unitPrice !== 'number' || isNaN(args.unitPrice) || args.unitPrice < 0) {
			throw new ToolInputError('"unitPrice" must be a non-negative number.');
		}
		patch.unitPrice = args.unitPrice;
	}
	if (args.unit !== undefined) {
		const unit = cleanText(args.unit);
		if (!unit) throw new ToolInputError('"unit" cannot be empty.');
		patch.unit = unit;
	}
	if (args.tvaRate !== undefined) {
		if (typeof args.tvaRate !== 'number' || isNaN(args.tvaRate) || args.tvaRate < 0) {
			throw new ToolInputError('"tvaRate" must be a non-negative number.');
		}
		patch.tvaRate = args.tvaRate;
	}

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one product field to update.');
	}

	const updated = await updateProductService(userId, args.id, patch);
	return { changed, product: updated };
}

export interface InvoiceLineParam {
	productId?: string | null;
	description: string;
	quantity: number;
	unitPrice: number;
	unit?: string;
	tvaRate?: number;
	position?: number;
}

export interface CreateInvoiceArgs {
	clientId: string;
	invoiceNumber?: string;
	invoiceDate?: string;
	dueDate?: string;
	status?: 'draft' | 'sent' | 'paid' | 'cancelled';
	paymentMode?: string | null;
	paymentConditions?: string | null;
	notes?: string | null;
	showTvaStamp?: boolean;
	lines: InvoiceLineParam[];
}

export interface UpdateInvoiceArgs {
	id: string;
	clientId?: string;
	invoiceNumber?: string;
	invoiceDate?: string;
	dueDate?: string;
	status?: 'draft' | 'sent' | 'paid' | 'cancelled';
	paymentMode?: string | null;
	paymentConditions?: string | null;
	notes?: string | null;
	showTvaStamp?: boolean;
	lines?: InvoiceLineParam[];
}

function sanitizeLines(lines: InvoiceLineParam[]): InvoiceLineInput[] {
	if (!lines || lines.length === 0) {
		throw new ToolInputError('An invoice must contain at least one line.');
	}
	return lines.map((l, index) => {
		const desc = l.description?.trim();
		if (!desc) throw new ToolInputError(`Line ${index + 1} must have a description.`);
		const qty = Number(l.quantity);
		if (isNaN(qty) || qty <= 0) throw new ToolInputError(`Line ${index + 1} quantity must be > 0.`);
		const price = Number(l.unitPrice);
		if (isNaN(price) || price < 0)
			throw new ToolInputError(`Line ${index + 1} unitPrice must be >= 0.`);

		return {
			productId: l.productId?.trim() || null,
			description: desc,
			quantity: qty,
			unitPrice: price,
			unit: l.unit?.trim() || 'Unité(s)',
			tvaRate: typeof l.tvaRate === 'number' ? l.tvaRate : 0,
			position: l.position ?? index
		};
	});
}

export async function createInvoice(userId: string, args: CreateInvoiceArgs) {
	if (!args.clientId?.trim()) throw new ToolInputError('"clientId" is required.');
	const client = await getClientService(userId, args.clientId.trim());
	if (!client) throw new ToolInputError(`No client found with id "${args.clientId}".`);

	const now = new Date();
	const invoiceDate = args.invoiceDate ? new Date(args.invoiceDate) : now;
	if (isNaN(invoiceDate.getTime())) throw new ToolInputError('"invoiceDate" is invalid.');

	let dueDate: Date;
	if (args.dueDate) {
		dueDate = new Date(args.dueDate);
		if (isNaN(dueDate.getTime())) throw new ToolInputError('"dueDate" is invalid.');
	} else {
		dueDate = new Date(invoiceDate);
		dueDate.setDate(dueDate.getDate() + 30);
	}

	const lines = sanitizeLines(args.lines);

	const inv = await createInvoiceService(userId, {
		clientId: args.clientId.trim(),
		invoiceNumber: args.invoiceNumber?.trim() || undefined,
		invoiceDate,
		dueDate,
		status: args.status || 'draft',
		paymentMode: cleanText(args.paymentMode),
		paymentConditions: cleanText(args.paymentConditions),
		notes: cleanText(args.notes),
		showTvaStamp: args.showTvaStamp,
		lines
	});

	return { invoice: inv };
}

export async function updateInvoice(userId: string, args: UpdateInvoiceArgs) {
	const existing = await getInvoiceService(userId, args.id);
	if (!existing) throw new ToolInputError(`No invoice found with id "${args.id}".`);

	const patch: Parameters<typeof updateInvoiceService>[2] = {};

	if (args.clientId !== undefined) {
		const cId = args.clientId.trim();
		const client = await getClientService(userId, cId);
		if (!client) throw new ToolInputError(`No client found with id "${cId}".`);
		patch.clientId = cId;
	}
	if (args.invoiceNumber !== undefined) {
		const invNum = cleanName(args.invoiceNumber);
		if (!invNum) throw new ToolInputError('"invoiceNumber" cannot be empty.');
		patch.invoiceNumber = invNum;
	}
	if (args.invoiceDate !== undefined) {
		const d = new Date(args.invoiceDate);
		if (isNaN(d.getTime())) throw new ToolInputError('"invoiceDate" is invalid.');
		patch.invoiceDate = d;
	}
	if (args.dueDate !== undefined) {
		const d = new Date(args.dueDate);
		if (isNaN(d.getTime())) throw new ToolInputError('"dueDate" is invalid.');
		patch.dueDate = d;
	}
	if (args.status !== undefined) {
		patch.status = args.status;
	}
	if (args.paymentMode !== undefined) patch.paymentMode = cleanText(args.paymentMode) ?? null;
	if (args.paymentConditions !== undefined)
		patch.paymentConditions = cleanText(args.paymentConditions) ?? null;
	if (args.notes !== undefined) patch.notes = cleanText(args.notes) ?? null;
	if (args.showTvaStamp !== undefined) patch.showTvaStamp = args.showTvaStamp;
	if (args.lines !== undefined) {
		patch.lines = sanitizeLines(args.lines);
	}

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one invoice field to update.');
	}

	const updated = await updateInvoiceService(userId, args.id, patch);
	return { changed, invoice: updated };
}
