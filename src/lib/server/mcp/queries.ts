import { db } from '$lib/server/db';
import {
	attachment,
	category,
	expense,
	page,
	reminder,
	reminderTemplate,
	reminderTodo,
	runningActivity,
	runningTrackPoint,
	tag,
	trainingActivity,
	trainingActivityItem,
	trainingExerciseRecord,
	trainingSession,
	treeElement,
	treeRelationship
} from '$lib/server/db/schema';
import { getAnalytics } from '$lib/server/services/analytics.service';
import { getCategories } from '$lib/server/services/category.service';
import { getDashboardNote } from '$lib/server/services/dashboard.service';
import { getUserSettings } from '$lib/server/services/finance.service';
import { globalSearch } from '$lib/server/services/search.service';
import { getTagsByUser } from '$lib/server/services/tag.service';
import { getBacklinks } from '$lib/server/services/wikilink.service';
import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';

// Read-only queries behind the MCP tools. Every function takes the user id
// resolved from the bearer token and filters on it, so a token can never see
// another account's rows. Nothing here writes.

export class ToolInputError extends Error {}

export type SearchType = 'item' | 'page' | 'reminder' | 'expense' | 'training' | 'tag';

export interface SearchArgs {
	query: string;
	type?: SearchType;
	limit?: number;
}

export interface ListPagesArgs {
	categoryId?: string;
	query?: string;
	limit?: number;
	offset?: number;
}

export interface ListItemsArgs {
	type?: 'node' | 'item';
	tag?: string;
	favorite?: boolean;
	query?: string;
	updatedAfter?: string;
	createdAfter?: string;
	limit?: number;
	offset?: number;
}

export interface DateRangeArgs {
	from?: string;
	to?: string;
}

export interface ListRemindersArgs extends DateRangeArgs {
	id?: string;
	status?: 'pending' | 'completed' | 'all';
	limit?: number;
	offset?: number;
}

export interface ListExpensesArgs extends DateRangeArgs {
	id?: string;
	tag?: string;
	limit?: number;
	offset?: number;
}

export interface ListTrainingArgs extends DateRangeArgs {
	limit?: number;
	offset?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MARKDOWN = 20_000;

function limitOf(value: number | undefined, fallback: number, max: number): number {
	const n = Math.trunc(value ?? fallback);
	return Math.min(Math.max(n, 1), max);
}

function offsetOf(value: number | undefined): number {
	return Math.max(Math.trunc(value ?? 0), 0);
}

/** Parse `YYYY-MM-DD` in server-local time; anything else as an ISO timestamp. */
function parseDate(value: string, endOfDay: boolean): Date {
	const trimmed = value.trim();
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (dateOnly) {
		const [, year, month, day] = dateOnly;
		return endOfDay
			? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
			: new Date(Number(year), Number(month) - 1, Number(day));
	}
	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) {
		throw new ToolInputError(`Invalid date "${value}". Use YYYY-MM-DD or an ISO 8601 timestamp.`);
	}
	return parsed;
}

export function resolveRange(args: DateRangeArgs, defaultDays: number): { from: Date; to: Date } {
	const to = args.to ? parseDate(args.to, true) : new Date();
	const from = args.from
		? parseDate(args.from, false)
		: new Date(to.getTime() - defaultDays * DAY_MS);
	if (from > to) throw new ToolInputError('"from" must be earlier than "to".');
	return { from, to };
}

function iso(value: Date | null | undefined): string | null {
	return value ? value.toISOString() : null;
}

function jsonStringArray(raw: string | null | undefined): string[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
	} catch {
		return [];
	}
}

function jsonObject(raw: string | null | undefined): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function truncateMarkdown(markdown: string | null): {
	markdown: string | null;
	truncated: boolean;
} {
	if (!markdown || markdown.length <= MAX_MARKDOWN) {
		return { markdown: markdown ?? null, truncated: false };
	}
	return { markdown: `${markdown.slice(0, MAX_MARKDOWN)}\n\n[truncated]`, truncated: true };
}

type TagRow = typeof tag.$inferSelect;
type TagMap = Map<string, TagRow>;

async function loadTagMap(userId: string): Promise<TagMap> {
	const rows = await getTagsByUser(userId);
	return new Map(rows.map((row) => [row.id, row]));
}

function tagSummaries(raw: string | null | undefined, tags: TagMap) {
	return jsonStringArray(raw)
		.map((id) => tags.get(id))
		.filter((row): row is TagRow => row !== undefined)
		.map((row) => ({ id: row.id, name: row.name, color: row.color }));
}

async function resolveTag(userId: string, value: string) {
	return db
		.select()
		.from(tag)
		.where(and(eq(tag.userId, userId), or(eq(tag.id, value), eq(tag.name, value))))
		.get();
}

// ─── Search ─────────────────────────────────────────────────────────────────

export async function searchAll(userId: string, args: SearchArgs) {
	const limit = limitOf(args.limit, 20, 50);
	const results = await globalSearch(
		userId,
		args.query,
		args.type ? Math.min(limit * 5, 200) : limit
	);
	const filtered = args.type ? results.filter((result) => result.type === args.type) : results;
	return {
		query: args.query,
		count: Math.min(filtered.length, limit),
		results: filtered.slice(0, limit)
	};
}

// ─── Knowledge tree ─────────────────────────────────────────────────────────

export async function listCategories(userId: string) {
	const [categories, pages] = await Promise.all([
		getCategories(userId),
		db
			.select({
				id: page.id,
				categoryId: page.categoryId,
				name: page.name,
				updatedAt: page.updatedAt
			})
			.from(page)
			.where(eq(page.userId, userId))
			.orderBy(asc(page.position))
			.all()
	]);

	return {
		count: categories.length,
		categories: categories.map((row) => {
			const owned = pages.filter((p) => p.categoryId === row.id);
			return {
				id: row.id,
				name: row.name,
				description: row.description,
				icon: row.icon,
				updatedAt: iso(row.updatedAt),
				pageCount: owned.length,
				pages: owned.map((p) => ({ id: p.id, name: p.name, updatedAt: iso(p.updatedAt) }))
			};
		})
	};
}

export async function listPages(userId: string, args: ListPagesArgs) {
	const limit = limitOf(args.limit, 25, 100);
	const conditions = [eq(page.userId, userId)];
	if (args.categoryId) conditions.push(eq(page.categoryId, args.categoryId));
	if (args.query?.trim()) {
		const term = `%${args.query.trim()}%`;
		conditions.push(or(like(page.name, term), like(page.description, term))!);
	}

	const rows = await db
		.select({
			id: page.id,
			name: page.name,
			description: page.description,
			categoryId: page.categoryId,
			categoryName: category.name,
			icon: page.icon,
			updatedAt: page.updatedAt,
			createdAt: page.createdAt,
			markdownLength: sql<number>`COALESCE(length(${page.markdown}), 0)`
		})
		.from(page)
		.innerJoin(category, eq(page.categoryId, category.id))
		.where(and(...conditions))
		.orderBy(desc(page.updatedAt))
		.limit(limit + 1)
		.offset(offsetOf(args.offset))
		.all();

	return {
		count: Math.min(rows.length, limit),
		hasMore: rows.length > limit,
		pages: rows.slice(0, limit)
	};
}

interface TreeSummary {
	id: string;
	type: 'node' | 'item';
	name: string;
	description: string | null;
	favorite: boolean;
	tags: string | null;
	updatedAt: Date;
}

interface TreeIndex {
	byId: Map<string, TreeSummary>;
	childrenByParent: Map<string, { childId: string; position: number }[]>;
}

async function loadTreeIndex(userId: string): Promise<TreeIndex> {
	const [elements, relationships] = await Promise.all([
		db
			.select({
				id: treeElement.id,
				type: treeElement.type,
				name: treeElement.name,
				description: treeElement.description,
				favorite: treeElement.favorite,
				tags: treeElement.tags,
				updatedAt: treeElement.updatedAt
			})
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
			.all(),
		db
			.select({
				parentType: treeRelationship.parentType,
				parentId: treeRelationship.parentId,
				childId: treeRelationship.childId,
				position: treeRelationship.position
			})
			.from(treeRelationship)
			.innerJoin(treeElement, eq(treeRelationship.childId, treeElement.id))
			.where(eq(treeElement.userId, userId))
			.all()
	]);

	const childrenByParent = new Map<string, { childId: string; position: number }[]>();
	for (const rel of relationships) {
		const key = `${rel.parentType}:${rel.parentId}`;
		const list = childrenByParent.get(key) ?? [];
		list.push({ childId: rel.childId, position: rel.position });
		childrenByParent.set(key, list);
	}

	return {
		byId: new Map(elements.map((element) => [element.id, element])),
		childrenByParent
	};
}

interface SubtreeNode {
	id: string;
	type: 'node' | 'item';
	name: string;
	description: string | null;
	favorite: boolean;
	tags: Array<{ id: string; name: string; color: string | null }>;
	updatedAt: string | null;
	children: SubtreeNode[];
}

function subtree(
	index: TreeIndex,
	tags: TagMap,
	parentType: string,
	parentId: string,
	depth: number,
	seen = new Set<string>()
): SubtreeNode[] {
	if (depth <= 0) return [];
	const entries = [...(index.childrenByParent.get(`${parentType}:${parentId}`) ?? [])].sort(
		(a, b) => a.position - b.position
	);

	return entries.flatMap((entry) => {
		const element = index.byId.get(entry.childId);
		if (!element || seen.has(element.id)) return [];
		const nextSeen = new Set(seen).add(element.id);
		return [
			{
				id: element.id,
				type: element.type,
				name: element.name,
				description: element.description,
				favorite: element.favorite,
				tags: tagSummaries(element.tags, tags),
				updatedAt: iso(element.updatedAt),
				children: subtree(index, tags, element.type, element.id, depth - 1, nextSeen)
			}
		];
	});
}

function depthOf(value: number | undefined): number {
	return limitOf(value, 2, 5);
}

export async function getPage(userId: string, id: string, depth?: number) {
	const row = await db
		.select()
		.from(page)
		.where(and(eq(page.id, id), eq(page.userId, userId)))
		.get();
	if (!row) throw new ToolInputError(`No page with id "${id}".`);

	const [cat, tags, index, backlinks, attachments] = await Promise.all([
		db
			.select({ id: category.id, name: category.name })
			.from(category)
			.where(and(eq(category.id, row.categoryId), eq(category.userId, userId)))
			.get(),
		loadTagMap(userId),
		loadTreeIndex(userId),
		getBacklinks(userId, 'page', row.id),
		db
			.select({
				id: attachment.id,
				originalName: attachment.originalName,
				mimeType: attachment.mimeType,
				size: attachment.size,
				createdAt: attachment.createdAt
			})
			.from(attachment)
			.where(and(eq(attachment.pageId, row.id), eq(attachment.userId, userId)))
			.all()
	]);

	const body = truncateMarkdown(row.markdown);
	return {
		page: {
			id: row.id,
			name: row.name,
			description: row.description,
			icon: row.icon,
			markdown: body.markdown,
			markdownTruncated: body.truncated,
			imageUrl: row.imageUrl,
			coverImageUrl: row.coverImageUrl,
			createdAt: iso(row.createdAt),
			updatedAt: iso(row.updatedAt)
		},
		category: cat ?? null,
		children: subtree(index, tags, 'page', row.id, depthOf(depth)),
		backlinks,
		attachments: attachments.map((a) => ({ ...a, createdAt: iso(a.createdAt) }))
	};
}

export async function getItem(userId: string, id: string, depth?: number) {
	const row = await db
		.select()
		.from(treeElement)
		.where(and(eq(treeElement.id, id), eq(treeElement.userId, userId)))
		.get();
	if (!row) throw new ToolInputError(`No item or node with id "${id}".`);

	const [tags, index, backlinks, parentRefs] = await Promise.all([
		loadTagMap(userId),
		loadTreeIndex(userId),
		getBacklinks(userId, 'tree_element', row.id),
		db
			.select({
				parentType: treeRelationship.parentType,
				parentId: treeRelationship.parentId
			})
			.from(treeRelationship)
			.where(eq(treeRelationship.childId, row.id))
			.all()
	]);

	const parents: Array<{
		type: 'page' | 'node' | 'item';
		id: string;
		name: string;
		categoryId?: string;
	}> = [];
	for (const ref of parentRefs) {
		if (ref.parentType === 'page') {
			const parentPage = await db
				.select({ id: page.id, name: page.name, categoryId: page.categoryId })
				.from(page)
				.where(and(eq(page.id, ref.parentId), eq(page.userId, userId)))
				.get();
			if (parentPage) parents.push({ type: 'page', ...parentPage });
			continue;
		}
		const parentElement = await db
			.select({ id: treeElement.id, name: treeElement.name, type: treeElement.type })
			.from(treeElement)
			.where(and(eq(treeElement.id, ref.parentId), eq(treeElement.userId, userId)))
			.get();
		if (parentElement) parents.push({ ...parentElement });
	}

	const body = truncateMarkdown(row.markdown);
	return {
		item: {
			id: row.id,
			type: row.type,
			name: row.name,
			description: row.description,
			markdown: body.markdown,
			markdownTruncated: body.truncated,
			imageUrl: row.imageUrl,
			videoUrl: row.videoUrl,
			externalUrl: row.externalUrl,
			favorite: row.favorite,
			tags: tagSummaries(row.tags, tags),
			metadata: jsonObject(row.metadata),
			ydkData: jsonObject(row.ydkData),
			createdAt: iso(row.createdAt),
			updatedAt: iso(row.updatedAt)
		},
		parents,
		children: subtree(index, tags, row.type, row.id, depthOf(depth)),
		backlinks
	};
}

export async function listItems(userId: string, args: ListItemsArgs) {
	const limit = limitOf(args.limit, 25, 100);
	const conditions = [eq(treeElement.userId, userId)];
	if (args.type) conditions.push(eq(treeElement.type, args.type));
	if (args.favorite !== undefined) conditions.push(eq(treeElement.favorite, args.favorite));
	if (args.query?.trim()) {
		const term = `%${args.query.trim()}%`;
		conditions.push(or(like(treeElement.name, term), like(treeElement.description, term))!);
	}
	if (args.updatedAfter) {
		conditions.push(gte(treeElement.updatedAt, parseDate(args.updatedAfter, false)));
	}
	if (args.createdAfter) {
		conditions.push(gte(treeElement.createdAt, parseDate(args.createdAfter, false)));
	}
	if (args.tag) {
		const resolved = await resolveTag(userId, args.tag);
		if (!resolved) throw new ToolInputError(`No tag with id or name "${args.tag}".`);
		conditions.push(like(treeElement.tags, `%${resolved.id}%`));
	}

	const [rows, tags] = await Promise.all([
		db
			.select({
				id: treeElement.id,
				type: treeElement.type,
				name: treeElement.name,
				description: treeElement.description,
				imageUrl: treeElement.imageUrl,
				externalUrl: treeElement.externalUrl,
				favorite: treeElement.favorite,
				tags: treeElement.tags,
				createdAt: treeElement.createdAt,
				updatedAt: treeElement.updatedAt,
				markdownLength: sql<number>`COALESCE(length(${treeElement.markdown}), 0)`
			})
			.from(treeElement)
			.where(and(...conditions))
			.orderBy(desc(treeElement.updatedAt))
			.limit(limit + 1)
			.offset(offsetOf(args.offset))
			.all(),
		loadTagMap(userId)
	]);

	return {
		count: Math.min(rows.length, limit),
		hasMore: rows.length > limit,
		items: rows.slice(0, limit).map((row) => ({
			...row,
			createdAt: iso(row.createdAt),
			updatedAt: iso(row.updatedAt),
			tags: tagSummaries(row.tags, tags)
		}))
	};
}

export async function listTags(userId: string) {
	const [tags, itemRows, expenseRows] = await Promise.all([
		getTagsByUser(userId),
		db
			.select({ tags: treeElement.tags })
			.from(treeElement)
			.where(eq(treeElement.userId, userId))
			.all(),
		db.select({ tags: expense.tags }).from(expense).where(eq(expense.userId, userId)).all()
	]);

	const itemCounts = new Map<string, number>();
	const expenseCounts = new Map<string, number>();
	for (const row of itemRows) {
		for (const id of jsonStringArray(row.tags)) {
			itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
		}
	}
	for (const row of expenseRows) {
		for (const id of jsonStringArray(row.tags)) {
			expenseCounts.set(id, (expenseCounts.get(id) ?? 0) + 1);
		}
	}

	return {
		count: tags.length,
		tags: tags
			.map((row) => ({
				id: row.id,
				name: row.name,
				color: row.color,
				itemCount: itemCounts.get(row.id) ?? 0,
				expenseCount: expenseCounts.get(row.id) ?? 0
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
}

// ─── Reminders ──────────────────────────────────────────────────────────────

export async function listReminders(userId: string, args: ListRemindersArgs) {
	const status = args.status ?? (args.id ? 'all' : 'pending');
	const limit = limitOf(args.limit, 25, 100);
	const conditions = [eq(reminder.userId, userId)];
	if (args.id) conditions.push(eq(reminder.id, args.id));
	if (status === 'pending') conditions.push(eq(reminder.completed, false));
	if (status === 'completed') conditions.push(eq(reminder.completed, true));
	if (args.from) conditions.push(gte(reminder.dueAt, parseDate(args.from, false)));
	if (args.to) conditions.push(lte(reminder.dueAt, parseDate(args.to, true)));

	const rows = await db
		.select()
		.from(reminder)
		.where(and(...conditions))
		.orderBy(status === 'pending' ? asc(reminder.dueAt) : desc(reminder.dueAt))
		.limit(limit + 1)
		.offset(offsetOf(args.offset))
		.all();
	const page = rows.slice(0, limit);
	const ids = page.map((row) => row.id);
	const templateIds = page.map((row) => row.templateId).filter((id): id is string => id !== null);

	const [todos, templates] = await Promise.all([
		ids.length > 0
			? db
					.select()
					.from(reminderTodo)
					.where(inArray(reminderTodo.reminderId, ids))
					.orderBy(asc(reminderTodo.position))
					.all()
			: Promise.resolve([]),
		templateIds.length > 0
			? db
					.select({ id: reminderTemplate.id, title: reminderTemplate.title })
					.from(reminderTemplate)
					.where(
						and(eq(reminderTemplate.userId, userId), inArray(reminderTemplate.id, templateIds))
					)
					.all()
			: Promise.resolve([])
	]);

	const todoMap = new Map<string, typeof todos>();
	for (const todo of todos) {
		const list = todoMap.get(todo.reminderId) ?? [];
		list.push(todo);
		todoMap.set(todo.reminderId, list);
	}
	const templateTitles = new Map(templates.map((row) => [row.id, row.title]));
	const now = Date.now();

	return {
		count: page.length,
		hasMore: rows.length > limit,
		reminders: page.map((row) => ({
			id: row.id,
			title: row.title,
			description: row.description,
			markdown: row.markdown,
			dueAt: iso(row.dueAt),
			completed: row.completed,
			completedAt: iso(row.completedAt),
			snoozedUntil: iso(row.snoozedUntil),
			overdue: !row.completed && row.dueAt.getTime() < now,
			templateId: row.templateId,
			templateTitle: row.templateId ? (templateTitles.get(row.templateId) ?? null) : null,
			createdAt: iso(row.createdAt),
			updatedAt: iso(row.updatedAt),
			todos: (todoMap.get(row.id) ?? []).map((todo) => ({
				id: todo.id,
				text: todo.text,
				completed: todo.completed
			}))
		}))
	};
}

// ─── Finance ────────────────────────────────────────────────────────────────

async function expenseConditions(userId: string, args: ListExpensesArgs) {
	const conditions = [eq(expense.userId, userId)];
	if (args.id) conditions.push(eq(expense.id, args.id));
	if (args.from) conditions.push(gte(expense.spentAt, parseDate(args.from, false)));
	if (args.to) conditions.push(lte(expense.spentAt, parseDate(args.to, true)));
	if (args.tag) {
		const resolved = await resolveTag(userId, args.tag);
		if (!resolved) throw new ToolInputError(`No tag with id or name "${args.tag}".`);
		conditions.push(like(expense.tags, `%${resolved.id}%`));
	}
	return conditions;
}

export async function listExpenses(userId: string, args: ListExpensesArgs) {
	const limit = limitOf(args.limit, 50, 200);
	const conditions = await expenseConditions(userId, args);

	const [rows, totals, tags, settings] = await Promise.all([
		db
			.select()
			.from(expense)
			.where(and(...conditions))
			.orderBy(desc(expense.spentAt))
			.limit(limit + 1)
			.offset(offsetOf(args.offset))
			.all(),
		db
			.select({
				total: sql<number>`COALESCE(SUM(${expense.amount}), 0)`,
				count: sql<number>`COUNT(*)`
			})
			.from(expense)
			.where(and(...conditions))
			.get(),
		loadTagMap(userId),
		getUserSettings(userId)
	]);

	return {
		count: Number(totals?.count ?? 0),
		total: Number(totals?.total ?? 0),
		currency: settings?.currency ?? 'DZD',
		hasMore: rows.length > limit,
		expenses: rows.slice(0, limit).map((row) => ({
			id: row.id,
			amount: row.amount,
			currency: row.currency,
			description: row.description,
			markdown: row.markdown,
			spentAt: iso(row.spentAt),
			tags: tagSummaries(row.tags, tags),
			createdAt: iso(row.createdAt)
		}))
	};
}

export async function financeSummary(userId: string, args: DateRangeArgs) {
	const { from, to } = resolveRange(args, 365);
	const month = sql<string>`strftime('%Y-%m', ${expense.spentAt} / 1000, 'unixepoch')`;

	const [rows, settings] = await Promise.all([
		db
			.select({
				month,
				total: sql<number>`SUM(${expense.amount})`,
				count: sql<number>`COUNT(*)`
			})
			.from(expense)
			.where(and(eq(expense.userId, userId), gte(expense.spentAt, from), lte(expense.spentAt, to)))
			.groupBy(month)
			.orderBy(month)
			.all(),
		getUserSettings(userId)
	]);

	const monthly = rows.map((row) => ({
		month: row.month,
		total: Number(row.total),
		count: Number(row.count)
	}));

	return {
		from: from.toISOString(),
		to: to.toISOString(),
		currency: settings?.currency ?? 'DZD',
		monthlyLimit: settings?.monthlySpendingLimit ?? null,
		total: monthly.reduce((sum, row) => sum + row.total, 0),
		count: monthly.reduce((sum, row) => sum + row.count, 0),
		monthly
	};
}

// ─── Training ───────────────────────────────────────────────────────────────

export async function listTrainingSessions(userId: string, args: ListTrainingArgs) {
	const limit = limitOf(args.limit, 25, 100);
	const conditions = [eq(trainingSession.userId, userId)];
	if (args.from) conditions.push(gte(trainingSession.startedAt, parseDate(args.from, false)));
	if (args.to) conditions.push(lte(trainingSession.startedAt, parseDate(args.to, true)));

	const rows = await db
		.select()
		.from(trainingSession)
		.where(and(...conditions))
		.orderBy(desc(trainingSession.startedAt))
		.limit(limit + 1)
		.offset(offsetOf(args.offset))
		.all();
	const page = rows.slice(0, limit);

	const activities =
		page.length > 0
			? await db
					.select({ sessionId: trainingActivity.sessionId, type: trainingActivity.type })
					.from(trainingActivity)
					.where(
						inArray(
							trainingActivity.sessionId,
							page.map((row) => row.id)
						)
					)
					.all()
			: [];

	const typesBySession = new Map<string, string[]>();
	for (const activity of activities) {
		const types = typesBySession.get(activity.sessionId) ?? [];
		if (!types.includes(activity.type)) types.push(activity.type);
		typesBySession.set(activity.sessionId, types);
	}

	return {
		count: page.length,
		hasMore: rows.length > limit,
		totalDuration: page.reduce((sum, row) => sum + (row.duration ?? 0), 0),
		sessions: page.map((row) => ({
			id: row.id,
			title: row.title,
			notes: row.notes,
			status: row.status,
			startedAt: iso(row.startedAt),
			endedAt: iso(row.endedAt),
			duration: row.duration,
			activityTypes: typesBySession.get(row.id) ?? []
		}))
	};
}

export async function getTrainingSession(userId: string, id: string) {
	const session = await db
		.select()
		.from(trainingSession)
		.where(and(eq(trainingSession.id, id), eq(trainingSession.userId, userId)))
		.get();
	if (!session) throw new ToolInputError(`No training session with id "${id}".`);

	const activities = await db
		.select()
		.from(trainingActivity)
		.where(eq(trainingActivity.sessionId, session.id))
		.orderBy(asc(trainingActivity.startedAt))
		.all();
	const activityIds = activities.map((activity) => activity.id);

	const [items, records, running, sourcePage, sourceNode] = await Promise.all([
		activityIds.length > 0
			? db
					.select({
						activityId: trainingActivityItem.activityId,
						itemId: treeElement.id,
						name: treeElement.name
					})
					.from(trainingActivityItem)
					.innerJoin(treeElement, eq(trainingActivityItem.itemId, treeElement.id))
					.where(
						and(
							inArray(trainingActivityItem.activityId, activityIds),
							eq(treeElement.userId, userId)
						)
					)
					.all()
			: Promise.resolve([]),
		activityIds.length > 0
			? db
					.select({
						id: trainingExerciseRecord.id,
						activityId: trainingExerciseRecord.activityId,
						itemId: treeElement.id,
						itemName: treeElement.name,
						sets: trainingExerciseRecord.sets,
						reps: trainingExerciseRecord.reps,
						weight: trainingExerciseRecord.weight,
						unit: trainingExerciseRecord.unit,
						rpe: trainingExerciseRecord.rpe,
						restTime: trainingExerciseRecord.restTime,
						notes: trainingExerciseRecord.notes
					})
					.from(trainingExerciseRecord)
					.innerJoin(treeElement, eq(trainingExerciseRecord.itemId, treeElement.id))
					.where(
						and(
							inArray(trainingExerciseRecord.activityId, activityIds),
							eq(treeElement.userId, userId)
						)
					)
					.orderBy(asc(trainingExerciseRecord.position))
					.all()
			: Promise.resolve([]),
		activityIds.length > 0
			? db
					.select()
					.from(runningActivity)
					.where(inArray(runningActivity.activityId, activityIds))
					.all()
			: Promise.resolve([]),
		session.sourcePageId
			? db
					.select({ id: page.id, name: page.name })
					.from(page)
					.where(and(eq(page.id, session.sourcePageId), eq(page.userId, userId)))
					.get()
			: Promise.resolve(undefined),
		session.sourceNodeId
			? db
					.select({ id: treeElement.id, name: treeElement.name })
					.from(treeElement)
					.where(and(eq(treeElement.id, session.sourceNodeId), eq(treeElement.userId, userId)))
					.get()
			: Promise.resolve(undefined)
	]);

	const runningIds = running.map((row) => row.activityId);
	const trackCounts =
		runningIds.length > 0
			? await db
					.select({
						activityId: runningTrackPoint.activityId,
						count: sql<number>`COUNT(*)`
					})
					.from(runningTrackPoint)
					.where(inArray(runningTrackPoint.activityId, runningIds))
					.groupBy(runningTrackPoint.activityId)
					.all()
			: [];
	const trackCountMap = new Map(trackCounts.map((row) => [row.activityId, Number(row.count)]));
	const runningMap = new Map(running.map((row) => [row.activityId, row]));

	return {
		session: {
			id: session.id,
			title: session.title,
			notes: session.notes,
			status: session.status,
			startedAt: iso(session.startedAt),
			endedAt: iso(session.endedAt),
			duration: session.duration,
			sourcePage: sourcePage ?? null,
			sourceNode: sourceNode ?? null
		},
		activities: activities.map((activity) => {
			const run = runningMap.get(activity.id);
			return {
				id: activity.id,
				type: activity.type,
				startedAt: iso(activity.startedAt),
				endedAt: iso(activity.endedAt),
				notes: activity.notes,
				items: items
					.filter((item) => item.activityId === activity.id)
					.map((item) => ({ id: item.itemId, name: item.name })),
				exercises: records.filter((record) => record.activityId === activity.id),
				running: run
					? {
							distanceMeters: run.distance,
							elapsedSeconds: run.elapsedDuration,
							movingSeconds: run.movingDuration,
							averageSpeedMps: run.averageSpeed,
							maxSpeedMps: run.maxSpeed,
							averagePaceSecondsPerKm: run.averagePace,
							bestPaceSecondsPerKm: run.bestPace,
							elevationGainMeters: run.elevationGain,
							elevationLossMeters: run.elevationLoss,
							trackPointCount: trackCountMap.get(activity.id) ?? 0
						}
					: null
			};
		})
	};
}

// ─── Overview ───────────────────────────────────────────────────────────────

export async function getStats(userId: string) {
	const [analytics, categories, tags, note, pendingReminders] = await Promise.all([
		getAnalytics(userId),
		getCategories(userId),
		getTagsByUser(userId),
		getDashboardNote(userId),
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(reminder)
			.where(and(eq(reminder.userId, userId), eq(reminder.completed, false)))
			.get()
	]);

	return {
		...analytics,
		counts: {
			categories: categories.length,
			tags: tags.length,
			pendingReminders: Number(pendingReminders?.count ?? 0)
		},
		dashboardNote: note || null
	};
}

export async function timeline(userId: string, args: DateRangeArgs & { limit?: number }) {
	const { from, to } = resolveRange(args, 7);
	const limit = limitOf(args.limit, 50, 200);

	const [pages, elements, reminders, expenses, sessions] = await Promise.all([
		db
			.select({ id: page.id, name: page.name, updatedAt: page.updatedAt })
			.from(page)
			.where(and(eq(page.userId, userId), gte(page.updatedAt, from), lte(page.updatedAt, to)))
			.orderBy(desc(page.updatedAt))
			.limit(limit)
			.all(),
		db
			.select({
				id: treeElement.id,
				name: treeElement.name,
				type: treeElement.type,
				updatedAt: treeElement.updatedAt
			})
			.from(treeElement)
			.where(
				and(
					eq(treeElement.userId, userId),
					gte(treeElement.updatedAt, from),
					lte(treeElement.updatedAt, to)
				)
			)
			.orderBy(desc(treeElement.updatedAt))
			.limit(limit)
			.all(),
		db
			.select({
				id: reminder.id,
				title: reminder.title,
				completedAt: reminder.completedAt,
				dueAt: reminder.dueAt
			})
			.from(reminder)
			.where(
				and(
					eq(reminder.userId, userId),
					eq(reminder.completed, true),
					gte(reminder.completedAt, from),
					lte(reminder.completedAt, to)
				)
			)
			.orderBy(desc(reminder.completedAt))
			.limit(limit)
			.all(),
		db
			.select({
				id: expense.id,
				amount: expense.amount,
				currency: expense.currency,
				description: expense.description,
				spentAt: expense.spentAt
			})
			.from(expense)
			.where(and(eq(expense.userId, userId), gte(expense.spentAt, from), lte(expense.spentAt, to)))
			.orderBy(desc(expense.spentAt))
			.limit(limit)
			.all(),
		db
			.select({
				id: trainingSession.id,
				title: trainingSession.title,
				startedAt: trainingSession.startedAt,
				duration: trainingSession.duration
			})
			.from(trainingSession)
			.where(
				and(
					eq(trainingSession.userId, userId),
					gte(trainingSession.startedAt, from),
					lte(trainingSession.startedAt, to)
				)
			)
			.orderBy(desc(trainingSession.startedAt))
			.limit(limit)
			.all()
	]);

	type Entry = {
		at: string;
		kind: string;
		id: string;
		title: string;
		detail?: string;
	};

	const entries: Entry[] = [
		...pages.map((row) => ({
			at: row.updatedAt.toISOString(),
			kind: 'page_updated',
			id: row.id,
			title: row.name
		})),
		...elements.map((row) => ({
			at: row.updatedAt.toISOString(),
			kind: row.type === 'node' ? 'node_updated' : 'item_updated',
			id: row.id,
			title: row.name
		})),
		...reminders.map((row) => ({
			at: row.completedAt!.toISOString(),
			kind: 'reminder_completed',
			id: row.id,
			title: row.title,
			detail: `due ${row.dueAt.toISOString()}`
		})),
		...expenses.map((row) => ({
			at: row.spentAt.toISOString(),
			kind: 'expense',
			id: row.id,
			title: `${row.amount} ${row.currency}`,
			detail: row.description ?? undefined
		})),
		...sessions.map((row) => ({
			at: row.startedAt.toISOString(),
			kind: 'training_session',
			id: row.id,
			title: row.title ?? 'Training session',
			detail: row.duration ? `${Math.round(row.duration / 60)} min` : undefined
		}))
	].sort((a, b) => b.at.localeCompare(a.at));

	return {
		from: from.toISOString(),
		to: to.toISOString(),
		count: Math.min(entries.length, limit),
		entries: entries.slice(0, limit)
	};
}
