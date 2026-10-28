import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { env } from '$env/dynamic/private';
import { db } from '../src/lib/server/db';
import {
	category,
	expense,
	page,
	reminder,
	reminderTodo,
	runningActivity,
	runningTrackPoint,
	tag,
	trainingActivity,
	trainingExerciseRecord,
	trainingSession,
	treeElement,
	treeRelationship,
	user,
	userSettings,
	wikilink
} from '../src/lib/server/db/schema';
import { authenticateMcpRequest } from '../src/lib/server/mcp/auth';
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
	timeline
} from '../src/lib/server/mcp/queries';

const OWNER = 'user-owner';
const OTHER = 'user-other';
const NOW = new Date('2026-10-28T12:00:00.000Z');

// Child tables first so foreign keys stay satisfied while clearing.
const TABLES = [
	'running_track_point',
	'running_activity',
	'training_exercise_record',
	'training_activity_item',
	'training_activity',
	'training_session',
	'reminder_todo',
	'reminder',
	'reminder_template_todo',
	'reminder_template',
	'attachment',
	'wikilink',
	'expense',
	'dashboard_note',
	'user_settings',
	'tree_relationship',
	'tree_element',
	'page',
	'category',
	'tag',
	'ydk_entry',
	'ydk_deck',
	'tier_list_entry',
	'tier_list_tier',
	'tier_list',
	'roadmap_edge',
	'roadmap_node',
	'roadmap',
	'timer_step',
	'timer_template',
	'push_subscription',
	'session',
	'account',
	'verification',
	'user'
];

async function reset() {
	for (const table of TABLES) {
		await db.$client.execute(`DELETE FROM "${table}"`);
	}
}

async function seed() {
	await db
		.insert(user)
		.values([
			{ id: OWNER, name: 'Owner', email: 'owner@example.com', emailVerified: true },
			{ id: OTHER, name: 'Other', email: 'other@example.com', emailVerified: true }
		])
		.run();

	await db
		.insert(category)
		.values([
			{ id: 'c1', userId: OWNER, name: 'Work', position: 0 },
			{ id: 'c2', userId: OTHER, name: 'Theirs', position: 0 }
		])
		.run();

	await db
		.insert(page)
		.values([
			{
				id: 'p1',
				userId: OWNER,
				categoryId: 'c1',
				name: 'Plan Page',
				description: 'Quarterly planning',
				markdown: '# Plan\n\nShip the thing.',
				position: 0
			},
			{ id: 'p2', userId: OTHER, categoryId: 'c2', name: 'Their Page', position: 0 }
		])
		.run();

	await db
		.insert(tag)
		.values([
			{ id: 't1', userId: OWNER, name: 'Focus', color: '#ff0000' },
			{ id: 't2', userId: OTHER, name: 'Theirs', color: '#00ff00' }
		])
		.run();

	await db
		.insert(treeElement)
		.values([
			{ id: 'n1', userId: OWNER, type: 'node', name: 'Training Notes' },
			{
				id: 'i1',
				userId: OWNER,
				type: 'item',
				name: 'Bench Press',
				description: 'Push day',
				markdown: 'Three sets of five.',
				tags: JSON.stringify(['t1'])
			},
			{ id: 'i2', userId: OTHER, type: 'item', name: 'Their Item' }
		])
		.run();

	await db
		.insert(treeRelationship)
		.values([
			{ parentType: 'page', parentId: 'p1', childType: 'node', childId: 'n1', position: 0 },
			{ parentType: 'node', parentId: 'n1', childType: 'item', childId: 'i1', position: 0 }
		])
		.run();

	await db
		.insert(wikilink)
		.values({
			userId: OWNER,
			sourceType: 'page',
			sourceId: 'p1',
			rawTarget: 'Bench Press',
			resolvedType: 'tree_element',
			resolvedId: 'i1'
		})
		.run();

	await db
		.insert(reminder)
		.values([
			{
				id: 'r1',
				userId: OWNER,
				title: 'Water plants',
				description: 'Kitchen and balcony',
				dueAt: NOW,
				completed: false
			},
			{
				id: 'r3',
				userId: OWNER,
				title: 'File taxes',
				dueAt: new Date('2026-10-27T09:00:00.000Z'),
				completed: true,
				completedAt: NOW
			},
			{ id: 'r2', userId: OTHER, title: 'Their reminder', dueAt: NOW, completed: false }
		])
		.run();

	await db
		.insert(reminderTodo)
		.values({ id: 'td1', reminderId: 'r1', text: 'Balcony', position: 0 })
		.run();

	await db
		.insert(expense)
		.values([
			{
				id: 'e1',
				userId: OWNER,
				amount: 150,
				currency: 'DZD',
				description: 'Groceries',
				tags: JSON.stringify(['t1']),
				spentAt: NOW
			},
			{
				id: 'e2',
				userId: OTHER,
				amount: 999,
				currency: 'DZD',
				description: 'Their expense',
				spentAt: NOW
			}
		])
		.run();

	await db
		.insert(userSettings)
		.values({ id: 's1', userId: OWNER, currency: 'DZD', monthlySpendingLimit: 5000 })
		.run();

	await db
		.insert(trainingSession)
		.values([
			{
				id: 'ts1',
				userId: OWNER,
				title: 'Push day',
				notes: 'Felt strong',
				status: 'completed',
				startedAt: NOW,
				endedAt: NOW,
				duration: 3600
			},
			{ id: 'ts2', userId: OTHER, startedAt: NOW }
		])
		.run();

	await db
		.insert(trainingActivity)
		.values([
			{ id: 'a1', sessionId: 'ts1', type: 'strength', startedAt: NOW },
			{ id: 'a2', sessionId: 'ts1', type: 'running', startedAt: NOW }
		])
		.run();

	await db
		.insert(trainingExerciseRecord)
		.values({
			id: 'x1',
			activityId: 'a1',
			itemId: 'i1',
			sets: 3,
			reps: '5',
			weight: 80,
			unit: 'kg',
			rpe: 8,
			position: 0
		})
		.run();

	await db
		.insert(runningActivity)
		.values({
			activityId: 'a2',
			distance: 5000,
			elapsedDuration: 1800,
			movingDuration: 1750,
			averagePace: 360
		})
		.run();

	await db
		.insert(runningTrackPoint)
		.values([
			{
				id: 'tp1',
				activityId: 'a2',
				sequence: 0,
				timestamp: NOW,
				latitude: 36.75,
				longitude: 3.06
			},
			{
				id: 'tp2',
				activityId: 'a2',
				sequence: 1,
				timestamp: NOW,
				latitude: 36.76,
				longitude: 3.07
			}
		])
		.run();
}

describe('mcp queries', () => {
	beforeEach(async () => {
		await reset();
		await seed();
	});

	describe('searchAll', () => {
		test('finds matching rows for the owner and nothing for another account', async () => {
			const mine = await searchAll(OWNER, { query: 'groceries' });
			expect(mine.results.map((r) => r.id)).toContain('e1');

			const theirs = await searchAll(OTHER, { query: 'groceries' });
			expect(theirs.results).toEqual([]);
		});

		test('filters by entity type', async () => {
			const result = await searchAll(OWNER, { query: 'plan', type: 'page' });
			expect(result.results.every((r) => r.type === 'page')).toBe(true);
			expect(result.results.map((r) => r.id)).toContain('p1');
		});
	});

	describe('knowledge tree', () => {
		test('listCategories returns only the owner categories with page counts', async () => {
			const result = await listCategories(OWNER);
			expect(result.categories.map((c) => c.id)).toEqual(['c1']);
			expect(result.categories[0].pageCount).toBe(1);
			expect(result.categories[0].pages.map((p) => p.id)).toEqual(['p1']);
		});

		test('listPages filters by category and text', async () => {
			expect((await listPages(OWNER, {})).pages.map((p) => p.id)).toEqual(['p1']);
			expect((await listPages(OWNER, { query: 'planning' })).pages.map((p) => p.id)).toEqual([
				'p1'
			]);
			expect((await listPages(OWNER, { categoryId: 'c2' })).pages).toEqual([]);
		});

		test('getPage returns markdown, category, and nested children', async () => {
			const result = await getPage(OWNER, 'p1', 2);
			expect(result.page.markdown).toContain('Ship the thing');
			expect(result.category?.name).toBe('Work');
			expect(result.children.map((c) => c.id)).toEqual(['n1']);
			expect(result.children[0].children.map((c) => c.id)).toEqual(['i1']);
		});

		test('getPage respects the depth limit', async () => {
			const result = await getPage(OWNER, 'p1', 1);
			expect(result.children[0].children).toEqual([]);
		});

		test('getItem returns tags, parents, and backlinks', async () => {
			const result = await getItem(OWNER, 'i1', 2);
			expect(result.item.name).toBe('Bench Press');
			expect(result.item.tags.map((t) => t.name)).toEqual(['Focus']);
			expect(result.parents.map((p) => p.id)).toEqual(['n1']);
			expect(result.backlinks.map((b) => b.title)).toEqual(['Plan Page']);
		});

		test('getItem refuses another account', async () => {
			await expect(getItem(OTHER, 'i1')).rejects.toThrow('No item or node');
		});

		test('listItems filters by tag name and type', async () => {
			expect((await listItems(OWNER, { tag: 'Focus' })).items.map((i) => i.id)).toEqual(['i1']);
			expect((await listItems(OWNER, { type: 'node' })).items.map((i) => i.id)).toEqual(['n1']);
			expect((await listItems(OWNER, { favorite: true })).items).toEqual([]);
		});

		test('listTags counts items and expenses', async () => {
			const result = await listTags(OWNER);
			expect(result.tags).toHaveLength(1);
			expect(result.tags[0]).toMatchObject({ name: 'Focus', itemCount: 1, expenseCount: 1 });
		});
	});

	describe('reminders', () => {
		test('lists pending reminders with todos and excludes other accounts', async () => {
			const result = await listReminders(OWNER, { status: 'pending' });
			expect(result.reminders.map((r) => r.id)).toEqual(['r1']);
			expect(result.reminders[0].todos.map((t) => t.text)).toEqual(['Balcony']);
			expect(result.reminders[0].overdue).toBe(true);
		});

		test('lists completed reminders by completed status', async () => {
			const result = await listReminders(OWNER, { status: 'completed' });
			expect(result.reminders.map((r) => r.id)).toEqual(['r3']);
		});

		test('fetches a single reminder by id without needing a status', async () => {
			const result = await listReminders(OWNER, { id: 'r3' });
			expect(result.reminders.map((r) => r.id)).toEqual(['r3']);
			expect((await listReminders(OTHER, { id: 'r1' })).reminders).toEqual([]);
		});
	});

	describe('finance', () => {
		test('listExpenses returns the filtered total and parsed tags', async () => {
			const result = await listExpenses(OWNER, {});
			expect(result.count).toBe(1);
			expect(result.total).toBe(150);
			expect(result.currency).toBe('DZD');
			expect(result.expenses[0].tags.map((t) => t.name)).toEqual(['Focus']);
		});

		test('listExpenses filters by tag', async () => {
			expect((await listExpenses(OWNER, { tag: 'Focus' })).count).toBe(1);
			await expect(listExpenses(OWNER, { tag: 'Theirs' })).rejects.toThrow('No tag');
		});

		test('listExpenses can fetch one expense by id', async () => {
			const result = await listExpenses(OWNER, { id: 'e1' });
			expect(result.expenses.map((e) => e.id)).toEqual(['e1']);
			expect((await listExpenses(OTHER, { id: 'e1' })).expenses).toEqual([]);
		});

		test('financeSummary groups by month', async () => {
			const result = await financeSummary(OWNER, {});
			expect(result.total).toBe(150);
			expect(result.monthly).toHaveLength(1);
			expect(result.monthly[0].total).toBe(150);
			expect(result.monthlyLimit).toBe(5000);
		});
	});

	describe('training', () => {
		test('listTrainingSessions reports activity types and duration', async () => {
			const result = await listTrainingSessions(OWNER, {});
			expect(result.sessions.map((s) => s.id)).toEqual(['ts1']);
			expect(result.totalDuration).toBe(3600);
			expect(result.sessions[0].activityTypes.sort()).toEqual(['running', 'strength']);
		});

		test('getTrainingSession includes exercises and running metrics', async () => {
			const result = await getTrainingSession(OWNER, 'ts1');
			expect(result.activities).toHaveLength(2);

			const strength = result.activities.find((a) => a.type === 'strength');
			expect(strength?.exercises[0]).toMatchObject({
				itemName: 'Bench Press',
				sets: 3,
				reps: '5',
				weight: 80
			});

			const running = result.activities.find((a) => a.type === 'running');
			expect(running?.running?.distanceMeters).toBe(5000);
			expect(running?.running?.trackPointCount).toBe(2);
		});

		test('getTrainingSession refuses another account', async () => {
			await expect(getTrainingSession(OTHER, 'ts1')).rejects.toThrow('No training session');
		});
	});

	describe('overview', () => {
		test('timeline merges every activity source in reverse order', async () => {
			const result = await timeline(OWNER, { from: '2026-10-20', to: '2026-10-29', limit: 100 });
			const kinds = new Set(result.entries.map((e) => e.kind));
			expect(kinds).toContain('page_updated');
			expect(kinds).toContain('item_updated');
			expect(kinds).toContain('reminder_completed');
			expect(kinds).toContain('expense');
			expect(kinds).toContain('training_session');

			for (let i = 1; i < result.entries.length; i++) {
				expect(result.entries[i - 1].at >= result.entries[i].at).toBe(true);
			}
		});

		test('getStats reports account counts', async () => {
			const result = await getStats(OWNER);
			expect(result.counts.categories).toBe(1);
			expect(result.counts.tags).toBe(1);
			expect(result.counts.pendingReminders).toBe(1);
		});
	});
});

describe('mcp auth', () => {
	const mutableEnv = env as unknown as Record<string, string | undefined>;
	const saved = {
		MCP_TOKEN: mutableEnv.MCP_TOKEN,
		MCP_USER_EMAIL: mutableEnv.MCP_USER_EMAIL,
		MCP_USER_ID: mutableEnv.MCP_USER_ID
	};

	beforeEach(async () => {
		await reset();
		await seed();
	});

	afterEach(() => {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete mutableEnv[key];
			else mutableEnv[key] = value;
		}
	});

	function request(headers: Record<string, string> = {}) {
		return new Request('https://example.com/api/mcp', { method: 'POST', headers });
	}

	test('is disabled without a configured token', async () => {
		delete mutableEnv.MCP_TOKEN;
		const result = await authenticateMcpRequest(request());
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(503);
	});

	test('rejects a missing or wrong token', async () => {
		mutableEnv.MCP_TOKEN = 'a'.repeat(32);
		mutableEnv.MCP_USER_EMAIL = 'owner@example.com';

		const missing = await authenticateMcpRequest(request());
		expect(missing.ok).toBe(false);
		if (!missing.ok) expect(missing.status).toBe(401);

		const wrong = await authenticateMcpRequest(
			request({ authorization: `Bearer ${'b'.repeat(32)}` })
		);
		expect(wrong.ok).toBe(false);
		if (!wrong.ok) expect(wrong.status).toBe(401);
	});

	test('resolves the configured account for a valid token', async () => {
		mutableEnv.MCP_TOKEN = 'a'.repeat(32);
		mutableEnv.MCP_USER_EMAIL = 'owner@example.com';

		const result = await authenticateMcpRequest(
			request({ authorization: `Bearer ${'a'.repeat(32)}` })
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.userId).toBe(OWNER);
	});

	test('requires an account choice when the instance has several users', async () => {
		mutableEnv.MCP_TOKEN = 'a'.repeat(32);
		delete mutableEnv.MCP_USER_EMAIL;
		delete mutableEnv.MCP_USER_ID;

		const result = await authenticateMcpRequest(
			request({ authorization: `Bearer ${'a'.repeat(32)}` })
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('Multiple accounts');
	});
});
