import { formatAmount, formatDate } from '$lib/utils/format';
import { db } from '$lib/server/db';
import {
	treeElement,
	page,
	reminder,
	reminderTemplate,
	expense,
	trainingSession,
	tag,
	todo,
	program,
	exercise,
	invoice
} from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { buildMatchQuery } from '$lib/server/db/search-index';

export interface SearchResult {
	type:
		| 'item'
		| 'page'
		| 'reminder'
		| 'expense'
		| 'training'
		| 'tag'
		| 'todo'
		| 'program'
		| 'exercise'
		| 'invoice';
	id: string;
	title: string;
	subtitle?: string;
	icon: string;
	url: string;
	imageUrl?: string;
}

interface SearchHit {
	entityType: string;
	entityId: string;
	snippet: string;
}

export async function globalSearch(
	userId: string,
	query: string,
	limit = 20
): Promise<SearchResult[]> {
	const match = buildMatchQuery(query ?? '');
	if (!match) return [];

	// One FTS5 query scores every domain at once. bm25 column weights rank
	// name matches over description matches over body matches.
	const res = await db.$client.execute({
		sql: `SELECT d.entity_type AS entityType, d.entity_id AS entityId,
				snippet(search_index, 2, '', '', '…', 12) AS snip,
				bm25(search_index, 10.0, 5.0, 1.0) AS rank
			FROM search_index
			JOIN search_doc d ON d.doc_id = search_index.rowid
			WHERE search_index MATCH ? AND d.user_id = ?
			ORDER BY rank
			LIMIT ?`,
		args: [match, userId, limit]
	});

	const hits: SearchHit[] = res.rows.map((row) => ({
		entityType: String(row.entityType),
		entityId: String(row.entityId),
		snippet: String(row.snip ?? '')
	}));
	if (hits.length === 0) return [];

	const idsByType = new Map<string, string[]>();
	for (const hit of hits) {
		const ids = idsByType.get(hit.entityType) ?? [];
		ids.push(hit.entityId);
		idsByType.set(hit.entityType, ids);
	}

	const shaped = new Map<string, SearchResult>();
	const add = (key: string, result: SearchResult) => shaped.set(key, result);
	const snipOf = (entityType: string, id: string) =>
		hits.find((h) => h.entityType === entityType && h.entityId === id)?.snippet || undefined;

	const itemIds = idsByType.get('tree_element') ?? [];
	if (itemIds.length > 0) {
		const rows = await db
			.select({
				id: treeElement.id,
				name: treeElement.name,
				description: treeElement.description,
				type: treeElement.type,
				imageUrl: treeElement.imageUrl
			})
			.from(treeElement)
			.where(inArray(treeElement.id, itemIds))
			.all();
		for (const item of rows) {
			add(`tree_element:${item.id}`, {
				type: 'item',
				id: item.id,
				title: item.name,
				subtitle: item.description || snipOf('tree_element', item.id),
				icon: item.type === 'node' ? 'fa-folder' : 'fa-cube',
				url: `/app/item/${item.id}`,
				imageUrl: item.imageUrl || undefined
			});
		}
	}

	const pageIds = idsByType.get('page') ?? [];
	if (pageIds.length > 0) {
		const rows = await db
			.select({
				id: page.id,
				name: page.name,
				description: page.description,
				categoryId: page.categoryId,
				icon: page.icon
			})
			.from(page)
			.where(inArray(page.id, pageIds))
			.all();
		for (const pg of rows) {
			add(`page:${pg.id}`, {
				type: 'page',
				id: pg.id,
				title: pg.name,
				subtitle: pg.description || snipOf('page', pg.id),
				icon: pg.icon || 'fa-file-alt',
				url: `/app/category/${pg.categoryId}/page/${pg.id}`
			});
		}
	}

	const reminderIds = idsByType.get('reminder') ?? [];
	if (reminderIds.length > 0) {
		const rows = await db
			.select({
				id: reminder.id,
				title: reminder.title,
				description: reminder.description,
				completed: reminder.completed
			})
			.from(reminder)
			.where(inArray(reminder.id, reminderIds))
			.all();
		for (const rem of rows) {
			add(`reminder:${rem.id}`, {
				type: 'reminder',
				id: rem.id,
				title: rem.title,
				subtitle: rem.description || (rem.completed ? 'Completed' : 'Pending'),
				icon: rem.completed ? 'fa-check-circle' : 'fa-bell',
				url: `/app/reminders/${rem.id}`
			});
		}
	}

	const templateIds = idsByType.get('reminder_template') ?? [];
	if (templateIds.length > 0) {
		const rows = await db
			.select({
				id: reminderTemplate.id,
				title: reminderTemplate.title,
				description: reminderTemplate.description
			})
			.from(reminderTemplate)
			.where(inArray(reminderTemplate.id, templateIds))
			.all();
		for (const tpl of rows) {
			add(`reminder_template:${tpl.id}`, {
				type: 'reminder',
				id: tpl.id,
				title: tpl.title,
				subtitle: tpl.description || 'Reminder template',
				icon: 'fa-bell',
				url: `/app/reminders/${tpl.id}`
			});
		}
	}

	const expenseIds = idsByType.get('expense') ?? [];
	if (expenseIds.length > 0) {
		const rows = await db
			.select({
				id: expense.id,
				amount: expense.amount,
				currency: expense.currency,
				description: expense.description
			})
			.from(expense)
			.where(inArray(expense.id, expenseIds))
			.all();
		for (const exp of rows) {
			add(`expense:${exp.id}`, {
				type: 'expense',
				id: exp.id,
				title: `${formatAmount(exp.amount)} ${exp.currency}`,
				subtitle: exp.description || snipOf('expense', exp.id),
				icon: 'fa-receipt',
				url: '/app/finance'
			});
		}
	}

	const sessionIds = idsByType.get('training_session') ?? [];
	if (sessionIds.length > 0) {
		const rows = await db
			.select({
				id: trainingSession.id,
				title: trainingSession.title,
				notes: trainingSession.notes,
				startedAt: trainingSession.startedAt
			})
			.from(trainingSession)
			.where(inArray(trainingSession.id, sessionIds))
			.all();
		for (const session of rows) {
			add(`training_session:${session.id}`, {
				type: 'training',
				id: session.id,
				title: session.title || 'Training Session',
				subtitle: session.notes || formatDate(new Date(session.startedAt)),
				icon: 'fa-dumbbell',
				url: `/app/training/session/${session.id}`
			});
		}
	}

	const tagIds = idsByType.get('tag') ?? [];
	if (tagIds.length > 0) {
		const rows = await db
			.select({ id: tag.id, name: tag.name })
			.from(tag)
			.where(inArray(tag.id, tagIds))
			.all();
		for (const t of rows) {
			add(`tag:${t.id}`, {
				type: 'tag',
				id: t.id,
				title: t.name,
				subtitle: 'Tag',
				icon: 'fa-tag',
				url: '/app/tags'
			});
		}
	}

	const todoIds = idsByType.get('todo') ?? [];
	if (todoIds.length > 0) {
		const rows = await db
			.select({ id: todo.id, title: todo.title, completed: todo.completed })
			.from(todo)
			.where(inArray(todo.id, todoIds))
			.all();
		for (const t of rows) {
			add(`todo:${t.id}`, {
				type: 'todo',
				id: t.id,
				title: t.title,
				subtitle: t.completed ? 'Completed task' : 'Task',
				icon: t.completed ? 'fa-check-circle' : 'fa-circle-check',
				url: '/app/todos'
			});
		}
	}

	const programIds = idsByType.get('program') ?? [];
	if (programIds.length > 0) {
		const rows = await db
			.select({ id: program.id, name: program.name, description: program.description })
			.from(program)
			.where(inArray(program.id, programIds))
			.all();
		for (const p of rows) {
			add(`program:${p.id}`, {
				type: 'program',
				id: p.id,
				title: p.name,
				subtitle: p.description || snipOf('program', p.id) || 'Training program',
				icon: 'fa-calendar-days',
				url: `/app/training/programs/${p.id}`
			});
		}
	}

	const exerciseIds = idsByType.get('exercise') ?? [];
	if (exerciseIds.length > 0) {
		const rows = await db
			.select({ id: exercise.id, name: exercise.name, equipment: exercise.equipment })
			.from(exercise)
			.where(inArray(exercise.id, exerciseIds))
			.all();
		for (const ex of rows) {
			add(`exercise:${ex.id}`, {
				type: 'exercise',
				id: ex.id,
				title: ex.name,
				subtitle: ex.equipment || snipOf('exercise', ex.id) || 'Exercise',
				icon: 'fa-dumbbell',
				url: '/app/training/exercises'
			});
		}
	}

	const invoiceIds = idsByType.get('invoice') ?? [];
	if (invoiceIds.length > 0) {
		const rows = await db
			.select({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status })
			.from(invoice)
			.where(inArray(invoice.id, invoiceIds))
			.all();
		for (const inv of rows) {
			add(`invoice:${inv.id}`, {
				type: 'invoice',
				id: inv.id,
				title: inv.invoiceNumber,
				subtitle: inv.status ? `Invoice · ${inv.status}` : 'Invoice',
				icon: 'fa-file-invoice',
				url: `/app/invoicing/${inv.id}`
			});
		}
	}

	// Return in relevance order across all domains.
	return hits
		.map((hit) => shaped.get(`${hit.entityType}:${hit.entityId}`))
		.filter((r): r is SearchResult => r !== undefined);
}
