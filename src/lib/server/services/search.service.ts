import { db } from '$lib/server/db';
import { treeElement, page, reminder, expense, trainingSession, tag } from '$lib/server/db/schema';
import { eq, like, or, and, desc } from 'drizzle-orm';

export interface SearchResult {
	type: 'item' | 'page' | 'reminder' | 'expense' | 'training' | 'tag';
	id: string;
	title: string;
	subtitle?: string;
	icon: string;
	url: string;
	imageUrl?: string;
}

export async function globalSearch(
	userId: string,
	query: string,
	limit = 20
): Promise<SearchResult[]> {
	if (!query || query.trim().length < 2) return [];

	const searchTerm = `%${query}%`;
	const results: SearchResult[] = [];

	// Search items
	const items = await db
		.select({
			id: treeElement.id,
			name: treeElement.name,
			description: treeElement.description,
			type: treeElement.type,
			imageUrl: treeElement.imageUrl
		})
		.from(treeElement)
		.where(
			and(
				eq(treeElement.userId, userId),
				or(like(treeElement.name, searchTerm), like(treeElement.description, searchTerm))
			)
		)
		.limit(limit)
		.all();

	for (const item of items) {
		results.push({
			type: 'item',
			id: item.id,
			title: item.name,
			subtitle: item.description || undefined,
			icon: item.type === 'node' ? 'fa-folder' : 'fa-cube',
			url: `/app/item/${item.id}`,
			imageUrl: item.imageUrl || undefined
		});
	}

	// Search pages
	const pages = await db
		.select({
			id: page.id,
			name: page.name,
			description: page.description,
			categoryId: page.categoryId,
			icon: page.icon
		})
		.from(page)
		.where(
			and(
				eq(page.userId, userId),
				or(like(page.name, searchTerm), like(page.description, searchTerm))
			)
		)
		.limit(limit)
		.all();

	for (const pg of pages) {
		results.push({
			type: 'page',
			id: pg.id,
			title: pg.name,
			subtitle: pg.description || undefined,
			icon: pg.icon || 'fa-file-alt',
			url: `/app/category/${pg.categoryId}/page/${pg.id}`
		});
	}

	// Search reminders
	const reminders = await db
		.select({
			id: reminder.id,
			title: reminder.title,
			description: reminder.description,
			completed: reminder.completed,
			dueAt: reminder.dueAt
		})
		.from(reminder)
		.where(
			and(
				eq(reminder.userId, userId),
				or(like(reminder.title, searchTerm), like(reminder.description, searchTerm))
			)
		)
		.orderBy(desc(reminder.dueAt))
		.limit(limit)
		.all();

	for (const rem of reminders) {
		results.push({
			type: 'reminder',
			id: rem.id,
			title: rem.title,
			subtitle: rem.description || (rem.completed ? 'Completed' : 'Pending'),
			icon: rem.completed ? 'fa-check-circle' : 'fa-bell',
			url: `/app/reminders/${rem.id}`
		});
	}

	// Search expenses
	const expenses = await db
		.select({
			id: expense.id,
			amount: expense.amount,
			currency: expense.currency,
			description: expense.description,
			spentAt: expense.spentAt
		})
		.from(expense)
		.where(and(eq(expense.userId, userId), like(expense.description, searchTerm)))
		.orderBy(desc(expense.spentAt))
		.limit(limit)
		.all();

	for (const exp of expenses) {
		results.push({
			type: 'expense',
			id: exp.id,
			title: `${exp.amount.toLocaleString()} ${exp.currency}`,
			subtitle: exp.description || undefined,
			icon: 'fa-receipt',
			url: '/app/finance'
		});
	}

	// Search training sessions
	const sessions = await db
		.select({
			id: trainingSession.id,
			title: trainingSession.title,
			notes: trainingSession.notes,
			startedAt: trainingSession.startedAt
		})
		.from(trainingSession)
		.where(
			and(
				eq(trainingSession.userId, userId),
				or(like(trainingSession.title, searchTerm), like(trainingSession.notes, searchTerm))
			)
		)
		.orderBy(desc(trainingSession.startedAt))
		.limit(limit)
		.all();

	for (const session of sessions) {
		results.push({
			type: 'training',
			id: session.id,
			title: session.title || 'Training Session',
			subtitle: session.notes || new Date(session.startedAt).toLocaleDateString(),
			icon: 'fa-dumbbell',
			url: `/app/training/session/${session.id}`
		});
	}

	// Search tags
	const tags = await db
		.select({
			id: tag.id,
			name: tag.name,
			color: tag.color
		})
		.from(tag)
		.where(and(eq(tag.userId, userId), like(tag.name, searchTerm)))
		.limit(limit)
		.all();

	for (const t of tags) {
		results.push({
			type: 'tag',
			id: t.id,
			title: t.name,
			subtitle: 'Tag',
			icon: 'fa-tag',
			url: '/app/tags'
		});
	}

	return results;
}
