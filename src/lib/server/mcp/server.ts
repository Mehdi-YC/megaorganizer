import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
	updateItem,
	updatePage,
	createClient,
	updateClient,
	createProduct,
	updateProduct,
	createInvoice,
	updateInvoice
} from './mutations';
import {
	financeSummary,
	getItem,
	getPage,
	getStats,
	getTrainingSession,
	listCategories,
	listExpenses,
	listItems,
	listPages,
	listReminders,
	listTags,
	listTrainingSessions,
	listClients,
	listProducts,
	listInvoices,
	getInvoice,
	searchAll,
	timeline,
	ToolInputError
} from './queries';

// Read tools only read; the two update_* tools edit existing rows. The user id
// is bound when the server is created (one server per HTTP request), so no
// tool takes a user id from the client.

const READ_ONLY = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false
} as const;

const WRITE = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false
} as const;

interface ToolResponse {
	[key: string]: unknown;
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

function textResult(data: unknown): ToolResponse {
	return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown): ToolResponse {
	const message =
		error instanceof ToolInputError
			? error.message
			: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
	return { content: [{ type: 'text', text: message }], isError: true };
}

async function safe(run: () => Promise<unknown>): Promise<ToolResponse> {
	try {
		return textResult(await run());
	} catch (error) {
		return errorResult(error);
	}
}

export function createMcpServer(userId: string): McpServer {
	const server = new McpServer(
		{ name: 'megaorganize', version: '1.1.0' },
		{
			capabilities: { tools: {} },
			instructions:
				'Access to one MegaOrganize account, with read and edit tools. Start with "search" when you do not know an id, or "timeline" for questions about recent activity. Use list_* tools to browse, then get_page/get_item/get_training_session/get_invoice for full detail. To manage content and invoicing, use update_page, update_item, create_client, update_client, create_product, update_product, create_invoice, or update_invoice. Only the fields you pass change, and null clears an optional field. Edits are saved immediately and visible in the app. Dates are ISO 8601; date-only arguments are interpreted in the server timezone.'
		}
	);

	server.registerTool(
		'search',
		{
			title: 'Search everything',
			description:
				'Full-text search across pages, items/nodes, reminders, expenses, training sessions, and tags. Use this first when you do not know the id of something. Returns the best matches with a short snippet.',
			inputSchema: {
				query: z.string().min(1).describe('Words to search for'),
				type: z
					.enum(['item', 'page', 'reminder', 'expense', 'training', 'tag'])
					.optional()
					.describe('Only return this kind of result'),
				limit: z.number().int().min(1).max(50).optional().describe('Maximum results (default 20)')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => searchAll(userId, args))
	);

	server.registerTool(
		'list_categories',
		{
			title: 'List categories',
			description:
				'List knowledge categories in display order, each with its pages. Categories are the top level of the knowledge tree.',
			annotations: READ_ONLY
		},
		async () => safe(() => listCategories(userId))
	);

	server.registerTool(
		'list_pages',
		{
			title: 'List pages',
			description:
				'List markdown pages, newest-updated first. Optionally filter by category id or by text in the page name/description.',
			inputSchema: {
				categoryId: z.string().optional().describe('Only pages in this category'),
				query: z.string().optional().describe('Text to match in the name or description'),
				limit: z.number().int().min(1).max(100).optional().describe('Maximum pages (default 25)'),
				offset: z.number().int().min(0).optional().describe('Skip this many pages')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listPages(userId, args))
	);

	server.registerTool(
		'get_page',
		{
			title: 'Read a page',
			description:
				'Read one page by id: markdown body, category, nested child nodes/items, backlinks, and attachments. Use list_pages or search to find the id.',
			inputSchema: {
				id: z.string().min(1).describe('Page id'),
				depth: z
					.number()
					.int()
					.min(1)
					.max(5)
					.optional()
					.describe('How many child levels to include (default 2)')
			},
			annotations: READ_ONLY
		},
		async ({ id, depth }) => safe(() => getPage(userId, id, depth))
	);

	server.registerTool(
		'get_item',
		{
			title: 'Read a node or item',
			description:
				'Read one tree node or item by id: markdown body, tags, parent chain, nested children, backlinks, metadata, and deck data when present.',
			inputSchema: {
				id: z.string().min(1).describe('Node or item id'),
				depth: z
					.number()
					.int()
					.min(1)
					.max(5)
					.optional()
					.describe('How many child levels to include (default 2)')
			},
			annotations: READ_ONLY
		},
		async ({ id, depth }) => safe(() => getItem(userId, id, depth))
	);

	server.registerTool(
		'list_items',
		{
			title: 'List nodes and items',
			description:
				'List tree nodes and items, newest-updated first. Filter by type, tag (name or id), favorite flag, text, or creation/update date.',
			inputSchema: {
				type: z.enum(['node', 'item']).optional().describe('Only nodes or only items'),
				tag: z.string().optional().describe('Tag name or id'),
				favorite: z.boolean().optional().describe('Only favorites (true) or non-favorites (false)'),
				query: z.string().optional().describe('Text to match in the name or description'),
				updatedAfter: z
					.string()
					.optional()
					.describe('ISO date/timestamp; only items updated since'),
				createdAfter: z
					.string()
					.optional()
					.describe('ISO date/timestamp; only items created since'),
				limit: z.number().int().min(1).max(100).optional().describe('Maximum items (default 25)'),
				offset: z.number().int().min(0).optional().describe('Skip this many items')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listItems(userId, args))
	);

	server.registerTool(
		'list_tags',
		{
			title: 'List tags',
			description: 'List tags with how many items and expenses use each one.',
			annotations: READ_ONLY
		},
		async () => safe(() => listTags(userId))
	);

	server.registerTool(
		'list_reminders',
		{
			title: 'List reminders',
			description:
				'List reminders with their todo checklists. Defaults to pending reminders ordered by due date; can return completed ones or all. Filter by id or due date range.',
			inputSchema: {
				id: z.string().optional().describe('Only this reminder id'),
				status: z
					.enum(['pending', 'completed', 'all'])
					.optional()
					.describe('Which reminders to return (default pending)'),
				from: z.string().optional().describe('ISO date/timestamp lower bound on due date'),
				to: z.string().optional().describe('ISO date/timestamp upper bound on due date'),
				limit: z
					.number()
					.int()
					.min(1)
					.max(100)
					.optional()
					.describe('Maximum reminders (default 25)'),
				offset: z.number().int().min(0).optional().describe('Skip this many reminders')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listReminders(userId, args))
	);

	server.registerTool(
		'list_expenses',
		{
			title: 'List expenses',
			description:
				'List expenses newest first, with the total and count for the whole filter (not just the returned page). Filter by spent-at range and tag.',
			inputSchema: {
				id: z.string().optional().describe('Only this expense id'),
				from: z.string().optional().describe('ISO date/timestamp lower bound on spent-at'),
				to: z.string().optional().describe('ISO date/timestamp upper bound on spent-at'),
				tag: z.string().optional().describe('Tag name or id'),
				limit: z
					.number()
					.int()
					.min(1)
					.max(200)
					.optional()
					.describe('Maximum expenses (default 50)'),
				offset: z.number().int().min(0).optional().describe('Skip this many expenses')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listExpenses(userId, args))
	);

	server.registerTool(
		'finance_summary',
		{
			title: 'Spending summary',
			description:
				'Monthly spending totals for a date range (default: last 365 days), plus the account currency and monthly spending limit.',
			inputSchema: {
				from: z.string().optional().describe('ISO date/timestamp lower bound'),
				to: z.string().optional().describe('ISO date/timestamp upper bound')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => financeSummary(userId, args))
	);

	server.registerTool(
		'list_training_sessions',
		{
			title: 'List training sessions',
			description:
				'List training sessions newest first, with their activity types and total duration. Filter by started-at range.',
			inputSchema: {
				from: z.string().optional().describe('ISO date/timestamp lower bound on start'),
				to: z.string().optional().describe('ISO date/timestamp upper bound on start'),
				limit: z
					.number()
					.int()
					.min(1)
					.max(100)
					.optional()
					.describe('Maximum sessions (default 25)'),
				offset: z.number().int().min(0).optional().describe('Skip this many sessions')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listTrainingSessions(userId, args))
	);

	server.registerTool(
		'get_training_session',
		{
			title: 'Read a training session',
			description:
				'Read one training session with its activities, linked items, strength exercise records (sets/reps/weight/RPE), and running metrics.',
			inputSchema: {
				id: z.string().min(1).describe('Training session id')
			},
			annotations: READ_ONLY
		},
		async ({ id }) => safe(() => getTrainingSession(userId, id))
	);

	server.registerTool(
		'timeline',
		{
			title: 'Activity timeline',
			description:
				'Chronological feed of what happened: pages and items updated, reminders completed, expenses, and training sessions. Use this for questions like "what did I do last week". Defaults to the last 7 days.',
			inputSchema: {
				from: z
					.string()
					.optional()
					.describe('ISO date/timestamp lower bound (default: 7 days ago)'),
				to: z.string().optional().describe('ISO date/timestamp upper bound (default: now)'),
				limit: z.number().int().min(1).max(200).optional().describe('Maximum entries (default 50)')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => timeline(userId, args))
	);

	server.registerTool(
		'get_stats',
		{
			title: 'Overall stats',
			description:
				'Overview of the account: training totals, this/last month spending, reminder completion rate and streaks, item/page counts, category and tag counts, pending reminders, and the dashboard note.',
			annotations: READ_ONLY
		},
		async () => safe(() => getStats(userId))
	);

	server.registerTool(
		'update_item',
		{
			title: 'Edit a node or item',
			description:
				'Edit an existing node or item in place. Only the fields you pass are changed; pass null (or an empty string) to clear description, markdown, or a media URL. "tags" replaces the whole tag list and accepts tag names or ids; use list_tags to see them. Images are public http(s) URLs, not file uploads. Call get_item first to read the current values. Changes are saved immediately.',
			inputSchema: {
				id: z.string().min(1).describe('Node or item id'),
				name: z.string().min(1).optional().describe('New name'),
				description: z.string().nullable().optional().describe('Short description; null clears it'),
				markdown: z
					.string()
					.nullable()
					.optional()
					.describe('Markdown body, replacing the current one; null clears it'),
				imageUrl: z
					.string()
					.nullable()
					.optional()
					.describe('Public http(s) image URL; null removes the image'),
				videoUrl: z
					.string()
					.nullable()
					.optional()
					.describe('Public http(s) video URL; null removes it'),
				externalUrl: z
					.string()
					.nullable()
					.optional()
					.describe('Public http(s) link to an external resource; null removes it'),
				tags: z
					.array(z.string().min(1))
					.max(50)
					.optional()
					.describe('Full replacement tag list, by name or id; [] removes all tags'),
				favorite: z.boolean().optional().describe('Mark as favorite or not')
			},
			annotations: WRITE
		},
		async (args) => safe(() => updateItem(userId, args))
	);

	server.registerTool(
		'update_page',
		{
			title: 'Edit a page',
			description:
				'Edit an existing markdown page. Only the fields you pass are changed; pass null (or an empty string) to clear description, markdown, icon, or an image URL. Images are public http(s) URLs, not file uploads. Call get_page first to read the current values. Changes are saved immediately.',
			inputSchema: {
				id: z.string().min(1).describe('Page id'),
				name: z.string().min(1).optional().describe('New name'),
				description: z.string().nullable().optional().describe('Short description; null clears it'),
				markdown: z
					.string()
					.nullable()
					.optional()
					.describe('Markdown body, replacing the current one; null clears it'),
				imageUrl: z
					.string()
					.nullable()
					.optional()
					.describe('Public http(s) image URL; null removes the image'),
				coverImageUrl: z
					.string()
					.nullable()
					.optional()
					.describe('Public http(s) cover image URL; null removes it'),
				icon: z.string().nullable().optional().describe('Icon class or short text; null clears it')
			},
			annotations: WRITE
		},
		async (args) => safe(() => updatePage(userId, args))
	);

	// ─── Clients ─────────────────────────────────────────────────────────────

	server.registerTool(
		'list_clients',
		{
			title: 'List invoicing clients',
			description: 'List all invoicing clients belonging to the authenticated user.',
			inputSchema: {},
			annotations: READ_ONLY
		},
		async () => safe(() => listClients(userId))
	);

	server.registerTool(
		'create_client',
		{
			title: 'Create invoicing client',
			description: 'Create a new invoicing client with optional tax and contact information.',
			inputSchema: {
				name: z.string().min(1).describe('Client or business name'),
				address: z.string().nullable().optional().describe('Street address'),
				city: z.string().nullable().optional().describe('City'),
				wilaya: z.string().nullable().optional().describe('Wilaya / province'),
				country: z.string().nullable().optional().describe('Country (defaults to Algérie)'),
				nif: z.string().nullable().optional().describe('Tax identification number (NIF)'),
				nis: z.string().nullable().optional().describe('Statistical identification number (NIS)'),
				rc: z.string().nullable().optional().describe('Trade registry number (RC)'),
				ai: z.string().nullable().optional().describe('Article d’imposition (AI)'),
				nTva: z.string().nullable().optional().describe('VAT registration number'),
				phone: z.string().nullable().optional().describe('Phone number'),
				email: z.string().nullable().optional().describe('Email address')
			},
			annotations: WRITE
		},
		async (args) => safe(() => createClient(userId, args))
	);

	server.registerTool(
		'update_client',
		{
			title: 'Update invoicing client',
			description:
				'Update an existing invoicing client. Pass only the fields you want to change; pass null to clear an optional field.',
			inputSchema: {
				id: z.string().min(1).describe('Client ID'),
				name: z.string().min(1).optional().describe('Client or business name'),
				address: z.string().nullable().optional().describe('Street address; null clears it'),
				city: z.string().nullable().optional().describe('City; null clears it'),
				wilaya: z.string().nullable().optional().describe('Wilaya; null clears it'),
				country: z.string().nullable().optional().describe('Country; null clears it'),
				nif: z.string().nullable().optional().describe('NIF; null clears it'),
				nis: z.string().nullable().optional().describe('NIS; null clears it'),
				rc: z.string().nullable().optional().describe('RC; null clears it'),
				ai: z.string().nullable().optional().describe('AI; null clears it'),
				nTva: z.string().nullable().optional().describe('VAT number; null clears it'),
				phone: z.string().nullable().optional().describe('Phone number; null clears it'),
				email: z.string().nullable().optional().describe('Email address; null clears it')
			},
			annotations: WRITE
		},
		async (args) => safe(() => updateClient(userId, args))
	);

	// ─── Products ────────────────────────────────────────────────────────────

	server.registerTool(
		'list_products',
		{
			title: 'List invoicing products and services',
			description: 'List all predefined products and services for invoicing.',
			inputSchema: {},
			annotations: READ_ONLY
		},
		async () => safe(() => listProducts(userId))
	);

	server.registerTool(
		'create_product',
		{
			title: 'Create invoicing product/service',
			description: 'Create a new reusable catalog product or service for invoicing.',
			inputSchema: {
				name: z.string().min(1).describe('Product or service name'),
				description: z.string().nullable().optional().describe('Description'),
				unitPrice: z.number().nonnegative().describe('Unit price in currency (DZD)'),
				unit: z.string().nullable().optional().describe('Unit label (defaults to Unité(s))'),
				tvaRate: z.number().nonnegative().optional().describe('VAT rate percentage (e.g. 19 or 0)')
			},
			annotations: WRITE
		},
		async (args) => safe(() => createProduct(userId, args))
	);

	server.registerTool(
		'update_product',
		{
			title: 'Update invoicing product/service',
			description: 'Update an existing invoicing product or service.',
			inputSchema: {
				id: z.string().min(1).describe('Product ID'),
				name: z.string().min(1).optional().describe('Product or service name'),
				description: z.string().nullable().optional().describe('Description; null clears it'),
				unitPrice: z.number().nonnegative().optional().describe('Unit price in currency (DZD)'),
				unit: z.string().min(1).optional().describe('Unit label'),
				tvaRate: z.number().nonnegative().optional().describe('VAT rate percentage')
			},
			annotations: WRITE
		},
		async (args) => safe(() => updateProduct(userId, args))
	);

	// ─── Invoices ────────────────────────────────────────────────────────────

	server.registerTool(
		'list_invoices',
		{
			title: 'List invoices',
			description: 'List invoices, optionally filtered by year, status, or client.',
			inputSchema: {
				year: z.number().int().optional().describe('Filter by fiscal year (e.g. 2026)'),
				status: z
					.enum(['draft', 'sent', 'paid', 'cancelled'])
					.optional()
					.describe('Filter by invoice status'),
				clientId: z.string().optional().describe('Filter by client ID'),
				limit: z.number().int().min(1).max(100).optional().describe('Maximum results (default 50)')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => listInvoices(userId, args))
	);

	server.registerTool(
		'get_invoice',
		{
			title: 'Get invoice details',
			description: 'Retrieve full details of an invoice including client and itemized lines.',
			inputSchema: {
				id: z.string().min(1).describe('Invoice ID')
			},
			annotations: READ_ONLY
		},
		async (args) => safe(() => getInvoice(userId, args.id))
	);

	server.registerTool(
		'create_invoice',
		{
			title: 'Create invoice',
			description:
				'Create a new invoice with itemized lines. Computes subtotal, VAT, and total automatically. If invoiceNumber is omitted, a sequential number (FAC/YYYY/NNNNN) is generated automatically.',
			inputSchema: {
				clientId: z.string().min(1).describe('Client ID for this invoice'),
				invoiceNumber: z
					.string()
					.optional()
					.describe('Custom invoice number (e.g. FAC/2026/00001)'),
				invoiceDate: z
					.string()
					.optional()
					.describe('Invoice date (ISO string or YYYY-MM-DD; defaults to today)'),
				dueDate: z
					.string()
					.optional()
					.describe('Due date (ISO string or YYYY-MM-DD; defaults to invoiceDate + 30 days)'),
				status: z
					.enum(['draft', 'sent', 'paid', 'cancelled'])
					.optional()
					.describe('Status (default draft)'),
				paymentMode: z
					.string()
					.nullable()
					.optional()
					.describe('Payment method (e.g. Virement bancaire / Chèque)'),
				paymentConditions: z.string().nullable().optional().describe('Payment terms'),
				notes: z.string().nullable().optional().describe('Public notes or legal remarks'),
				showTvaStamp: z
					.boolean()
					.optional()
					.describe('Whether to show the TVA stamp / article mention'),
				lines: z
					.array(
						z.object({
							productId: z.string().nullable().optional().describe('Referenced product ID'),
							description: z.string().min(1).describe('Line description or service detail'),
							quantity: z.number().positive().describe('Quantity'),
							unitPrice: z.number().nonnegative().describe('Unit price'),
							unit: z.string().optional().describe('Unit label (defaults to Unité(s))'),
							tvaRate: z
								.number()
								.nonnegative()
								.optional()
								.describe('TVA rate percentage (e.g. 19 or 0)'),
							position: z.number().int().optional().describe('Display order index')
						})
					)
					.min(1)
					.describe('List of itemized invoice lines')
			},
			annotations: WRITE
		},
		async (args) => safe(() => createInvoice(userId, args))
	);

	server.registerTool(
		'update_invoice',
		{
			title: 'Update invoice',
			description:
				'Update an existing invoice. You can update header fields, status, or replace all line items. Totals are recalculated automatically.',
			inputSchema: {
				id: z.string().min(1).describe('Invoice ID'),
				clientId: z.string().min(1).optional().describe('Client ID'),
				invoiceNumber: z.string().min(1).optional().describe('Invoice number'),
				invoiceDate: z.string().optional().describe('Invoice date (ISO string or YYYY-MM-DD)'),
				dueDate: z.string().optional().describe('Due date (ISO string or YYYY-MM-DD)'),
				status: z
					.enum(['draft', 'sent', 'paid', 'cancelled'])
					.optional()
					.describe('Invoice status'),
				paymentMode: z.string().nullable().optional().describe('Payment method; null clears it'),
				paymentConditions: z
					.string()
					.nullable()
					.optional()
					.describe('Payment conditions; null clears it'),
				notes: z.string().nullable().optional().describe('Notes; null clears it'),
				showTvaStamp: z.boolean().optional().describe('Whether to show TVA stamp'),
				lines: z
					.array(
						z.object({
							productId: z.string().nullable().optional().describe('Referenced product ID'),
							description: z.string().min(1).describe('Line description'),
							quantity: z.number().positive().describe('Quantity'),
							unitPrice: z.number().nonnegative().describe('Unit price'),
							unit: z.string().optional().describe('Unit label'),
							tvaRate: z.number().nonnegative().optional().describe('TVA rate percentage'),
							position: z.number().int().optional().describe('Display order index')
						})
					)
					.min(1)
					.optional()
					.describe('Replacement list of invoice lines')
			},
			annotations: WRITE
		},
		async (args) => safe(() => updateInvoice(userId, args))
	);

	return server;
}
