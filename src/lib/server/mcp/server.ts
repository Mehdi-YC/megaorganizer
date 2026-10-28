import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
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
	searchAll,
	timeline,
	ToolInputError
} from './queries';

// All tools are read-only. The user id is bound when the server is created
// (one server per HTTP request), so no tool takes a user id from the client.

const READ_ONLY = {
	readOnlyHint: true,
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
		{ name: 'megaorganize', version: '1.0.0' },
		{
			capabilities: { tools: {} },
			instructions:
				'Read-only access to one MegaOrganize account. Start with "search" when you do not know an id, or "timeline" for questions about recent activity. Use list_* tools to browse, then get_page/get_item/get_training_session for full detail. Dates are ISO 8601; date-only arguments are interpreted in the server timezone. Nothing here writes data.'
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

	return server;
}
