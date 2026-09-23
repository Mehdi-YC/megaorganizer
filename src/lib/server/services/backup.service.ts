import { db } from '$lib/server/db';
import { rebuildAllDocLinks } from './wikilink.service';
import {
	category,
	page,
	treeElement,
	treeRelationship,
	tag,
	attachment,
	reminderTemplate,
	reminderTemplateTodo,
	reminder,
	reminderTodo,
	expense,
	userSettings,
	trainingSession,
	trainingActivity,
	trainingActivityItem,
	trainingExerciseRecord,
	runningActivity,
	runningTrackPoint,
	roadmap,
	roadmapNode,
	roadmapEdge,
	tierList,
	tierListTier,
	tierListEntry,
	ydkDeck,
	ydkEntry,
	timerTemplate,
	timerStep
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { getCategories, getCategoryPages } from './category.service';
import { getTagsByUser } from './tag.service';

const UPLOAD_DIR = path.resolve('static/uploads');

type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function toDate(value: Date | string | number | undefined | null): Date | null {
	if (value == null) return null;
	if (value instanceof Date) return value;
	return new Date(value);
}

// ─── Export ──────────────────────────────────────────────────────────────────

async function exportAttachments(userId: string) {
	const records = await db.select().from(attachment).where(eq(attachment.userId, userId)).all();

	const result = [];
	for (const rec of records) {
		try {
			const filePath = path.join(UPLOAD_DIR, userId, rec.storedName);
			const buffer = await readFile(filePath);
			result.push({
				id: rec.id,
				pageId: rec.pageId,
				originalName: rec.originalName,
				mimeType: rec.mimeType,
				size: rec.size,
				data: buffer.toString('base64')
			});
		} catch {
			// Skip files that can't be read
		}
	}
	return result;
}

async function exportReminders(userId: string) {
	const templates = await db
		.select()
		.from(reminderTemplate)
		.where(eq(reminderTemplate.userId, userId))
		.all();
	const templateIds = templates.map((t) => t.id);
	const templateTodos = templateIds.length
		? await db
				.select()
				.from(reminderTemplateTodo)
				.where(inArray(reminderTemplateTodo.templateId, templateIds))
				.all()
		: [];

	const reminders = await db.select().from(reminder).where(eq(reminder.userId, userId)).all();
	const reminderIds = reminders.map((r) => r.id);
	const reminderTodos = reminderIds.length
		? await db
				.select()
				.from(reminderTodo)
				.where(inArray(reminderTodo.reminderId, reminderIds))
				.all()
		: [];

	return {
		reminderTemplates: templates.map((t) => ({
			id: t.id,
			title: t.title,
			description: t.description,
			markdown: t.markdown,
			icon: t.icon,
			iconColor: t.iconColor,
			recurrenceType: t.recurrenceType,
			recurrenceConfig: t.recurrenceConfig,
			nextDueAt: t.nextDueAt,
			active: t.active,
			position: t.position,
			todos: templateTodos
				.filter((td) => td.templateId === t.id)
				.map((td) => ({ text: td.text, position: td.position }))
		})),
		reminders: reminders.map((r) => ({
			id: r.id,
			templateId: r.templateId,
			title: r.title,
			description: r.description,
			markdown: r.markdown,
			dueAt: r.dueAt,
			completed: r.completed,
			completedAt: r.completedAt,
			snoozedUntil: r.snoozedUntil,
			todos: reminderTodos
				.filter((td) => td.reminderId === r.id)
				.map((td) => ({ text: td.text, completed: td.completed, position: td.position }))
		}))
	};
}

async function exportTraining(userId: string) {
	const sessions = await db
		.select()
		.from(trainingSession)
		.where(eq(trainingSession.userId, userId))
		.all();
	const sessionIds = sessions.map((s) => s.id);
	const activities = sessionIds.length
		? await db
				.select()
				.from(trainingActivity)
				.where(inArray(trainingActivity.sessionId, sessionIds))
				.all()
		: [];
	const activityIds = activities.map((a) => a.id);

	const [activityItems, exerciseRecords, runningRows, trackPoints] = activityIds.length
		? await Promise.all([
				db
					.select()
					.from(trainingActivityItem)
					.where(inArray(trainingActivityItem.activityId, activityIds))
					.all(),
				db
					.select()
					.from(trainingExerciseRecord)
					.where(inArray(trainingExerciseRecord.activityId, activityIds))
					.all(),
				db
					.select()
					.from(runningActivity)
					.where(inArray(runningActivity.activityId, activityIds))
					.all(),
				db
					.select()
					.from(runningTrackPoint)
					.where(inArray(runningTrackPoint.activityId, activityIds))
					.all()
			])
		: [[], [], [], []];

	return {
		sessions: sessions.map((s) => ({
			id: s.id,
			title: s.title,
			notes: s.notes,
			status: s.status,
			startedAt: s.startedAt,
			endedAt: s.endedAt,
			duration: s.duration,
			activities: activities
				.filter((a) => a.sessionId === s.id)
				.map((a) => {
					const running = runningRows.find((r) => r.activityId === a.id);
					return {
						id: a.id,
						type: a.type,
						startedAt: a.startedAt,
						endedAt: a.endedAt,
						notes: a.notes,
						items: activityItems
							.filter((li) => li.activityId === a.id)
							.map((li) => ({ itemId: li.itemId })),
						exerciseRecords: exerciseRecords
							.filter((er) => er.activityId === a.id)
							.map((er) => ({
								itemId: er.itemId,
								sets: er.sets,
								reps: er.reps,
								weight: er.weight,
								unit: er.unit,
								rpe: er.rpe,
								restTime: er.restTime,
								notes: er.notes,
								position: er.position
							})),
						running: running
							? {
									distance: running.distance,
									elapsedDuration: running.elapsedDuration,
									movingDuration: running.movingDuration,
									averageSpeed: running.averageSpeed,
									maxSpeed: running.maxSpeed,
									averagePace: running.averagePace,
									bestPace: running.bestPace,
									elevationGain: running.elevationGain,
									elevationLoss: running.elevationLoss,
									trackPoints: trackPoints
										.filter((p) => p.activityId === a.id)
										.sort((x, y) => x.sequence - y.sequence)
										.map((p) => ({
											sequence: p.sequence,
											timestamp: p.timestamp,
											latitude: p.latitude,
											longitude: p.longitude,
											altitude: p.altitude,
											accuracy: p.accuracy,
											speed: p.speed,
											heading: p.heading
										}))
								}
							: null
					};
				})
		}))
	};
}

async function exportRoadmaps(userId: string) {
	const roadmaps = await db.select().from(roadmap).where(eq(roadmap.userId, userId)).all();
	const ids = roadmaps.map((r) => r.id);
	const [nodes, edges] = ids.length
		? await Promise.all([
				db.select().from(roadmapNode).where(inArray(roadmapNode.roadmapId, ids)).all(),
				db.select().from(roadmapEdge).where(inArray(roadmapEdge.roadmapId, ids)).all()
			])
		: [[], []];

	return roadmaps.map((r) => ({
		id: r.id,
		name: r.name,
		description: r.description,
		nodes: nodes
			.filter((n) => n.roadmapId === r.id)
			.map((n) => ({
				id: n.id,
				itemId: n.itemId,
				label: n.label,
				status: n.status,
				progress: n.progress,
				x: n.x,
				y: n.y
			})),
		edges: edges
			.filter((e) => e.roadmapId === r.id)
			.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId }))
	}));
}

async function exportTierLists(userId: string) {
	const lists = await db.select().from(tierList).where(eq(tierList.userId, userId)).all();
	const listIds = lists.map((l) => l.id);
	const tiers = listIds.length
		? await db.select().from(tierListTier).where(inArray(tierListTier.tierListId, listIds)).all()
		: [];
	const tierIds = tiers.map((t) => t.id);
	const entries = tierIds.length
		? await db.select().from(tierListEntry).where(inArray(tierListEntry.tierId, tierIds)).all()
		: [];

	return lists.map((l) => ({
		id: l.id,
		name: l.name,
		description: l.description,
		tiers: tiers
			.filter((t) => t.tierListId === l.id)
			.map((t) => ({
				id: t.id,
				label: t.label,
				color: t.color,
				position: t.position,
				entries: entries
					.filter((e) => e.tierId === t.id)
					.map((e) => ({ itemId: e.itemId, position: e.position }))
			}))
	}));
}

async function exportYdkDecks(userId: string) {
	const decks = await db.select().from(ydkDeck).where(eq(ydkDeck.userId, userId)).all();
	const deckIds = decks.map((d) => d.id);
	const entries = deckIds.length
		? await db.select().from(ydkEntry).where(inArray(ydkEntry.deckId, deckIds)).all()
		: [];

	return decks.map((d) => ({
		id: d.id,
		name: d.name,
		entries: entries
			.filter((e) => e.deckId === d.id)
			.map((e) => ({ section: e.section, cardId: e.cardId, position: e.position }))
	}));
}

async function exportTimers(userId: string) {
	const templates = await db
		.select()
		.from(timerTemplate)
		.where(eq(timerTemplate.userId, userId))
		.all();
	const ids = templates.map((t) => t.id);
	const steps = ids.length
		? await db.select().from(timerStep).where(inArray(timerStep.timerTemplateId, ids)).all()
		: [];

	type StepRow = (typeof steps)[number];
	type NestedStep = Pick<StepRow, 'kind' | 'label' | 'durationSec' | 'groupRounds' | 'position'> & {
		children?: NestedStep[];
	};

	return templates.map((t) => {
		const tplSteps = steps.filter((s) => s.timerTemplateId === t.id);
		const nest = (parent: string | null): NestedStep[] =>
			tplSteps
				.filter((s) => (s.parentId ?? null) === parent)
				.sort((a, b) => a.position - b.position)
				.map((s) => {
					const children = nest(s.id);
					const base: NestedStep = {
						kind: s.kind,
						label: s.label,
						durationSec: s.durationSec,
						groupRounds: s.groupRounds,
						position: s.position
					};
					return children.length > 0 ? { ...base, children } : base;
				});
		return {
			id: t.id,
			name: t.name,
			description: t.description,
			rounds: t.rounds,
			steps: nest(null)
		};
	});
}

export async function exportUserData(userId: string) {
	const cats = await getCategories(userId);
	const tags = await getTagsByUser(userId);

	const allTreeElements = await db
		.select()
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();

	const elementIds = new Set(allTreeElements.map((e) => e.id));
	const allRels = await db.select().from(treeRelationship).all();
	// A page→element relationship can match both filters; export each once.
	const seenRels = new Set<string>();
	const relKey = (r: (typeof allRels)[number]) =>
		`${r.parentType}:${r.parentId}->${r.childType}:${r.childId}`;
	const keepRel = (r: (typeof allRels)[number]) => {
		const key = relKey(r);
		if (seenRels.has(key)) return false;
		seenRels.add(key);
		return true;
	};
	const userRels = allRels.filter(
		(r) => (elementIds.has(r.parentId) || elementIds.has(r.childId)) && keepRel(r)
	);

	const pageIds = new Set<string>();
	for (const cat of cats) {
		const pages = await getCategoryPages(userId, cat.id);
		for (const pg of pages) pageIds.add(pg.id);
	}
	const pageRels = allRels.filter((r) => pageIds.has(r.parentId) && keepRel(r));

	const categoriesWithPages = await Promise.all(
		cats.map(async (cat) => {
			const pages = await getCategoryPages(userId, cat.id);
			return {
				id: cat.id,
				name: cat.name,
				description: cat.description,
				icon: cat.icon,
				iconColor: cat.iconColor,
				accentColor: cat.accentColor,
				backgroundColor: cat.backgroundColor,
				imageUrl: cat.imageUrl,
				position: cat.position,
				pages: pages.map((p) => ({
					id: p.id,
					name: p.name,
					description: p.description,
					icon: p.icon,
					iconColor: p.iconColor,
					accentColor: p.accentColor,
					backgroundColor: p.backgroundColor,
					imageUrl: p.imageUrl,
					coverImageUrl: p.coverImageUrl,
					markdown: p.markdown,
					position: p.position
				}))
			};
		})
	);

	const attachments = await exportAttachments(userId);
	const remindersData = await exportReminders(userId);
	const trainingData = await exportTraining(userId);
	const roadmapsData = await exportRoadmaps(userId);
	const tierListsData = await exportTierLists(userId);
	const ydkDecksData = await exportYdkDecks(userId);
	const timersData = await exportTimers(userId);
	const settings = await db
		.select()
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.get();

	const expenses = await db.select().from(expense).where(eq(expense.userId, userId)).all();

	return {
		version: 3 as const,
		exportedAt: new Date().toISOString(),
		categories: categoriesWithPages,
		treeElements: allTreeElements.map((el) => ({
			id: el.id,
			type: el.type,
			name: el.name,
			description: el.description,
			markdown: el.markdown,
			imageUrl: el.imageUrl,
			videoUrl: el.videoUrl,
			externalUrl: el.externalUrl,
			tags: el.tags,
			metadata: el.metadata,
			ydkData: el.ydkData,
			favorite: el.favorite
		})),
		treeRelationships: [...userRels, ...pageRels].map((r) => ({
			parentType: r.parentType as 'page' | 'node' | 'item',
			parentId: r.parentId,
			childType: r.childType as 'node' | 'item',
			childId: r.childId,
			position: r.position
		})),
		tags: tags.map((t) => ({
			id: t.id,
			name: t.name,
			color: t.color
		})),
		attachments,
		userSettings: settings
			? {
					currency: settings.currency,
					currencyRate: settings.currencyRate,
					monthlySpendingLimit: settings.monthlySpendingLimit
				}
			: null,
		reminders: remindersData.reminders,
		reminderTemplates: remindersData.reminderTemplates,
		expenses: expenses.map((e) => ({
			id: e.id,
			amount: e.amount,
			currency: e.currency,
			description: e.description,
			markdown: e.markdown,
			tags: e.tags,
			spentAt: e.spentAt
		})),
		training: trainingData,
		roadmaps: roadmapsData,
		tierLists: tierListsData,
		ydkDecks: ydkDecksData,
		timers: timersData
	};
}

// ─── Import (non-destructive) ────────────────────────────────────────────────

async function findExisting(executor: Db, dbTable: any, whereClause: any) {
	// runningActivity uses activityId as its PK instead of id.
	const idColumn = dbTable.id ?? dbTable.activityId;
	return executor.select({ id: idColumn }).from(dbTable).where(whereClause).get();
}

export async function importUserData(userId: string, data: any) {
	if (!data || (data.version !== 1 && data.version !== 2 && data.version !== 3)) {
		return { success: false, message: 'Invalid backup format', counts: {} };
	}

	const idMap = new Map<string, string>();
	const counts: Record<string, number> = {
		categories: 0,
		pages: 0,
		elements: 0,
		relationships: 0,
		tags: 0,
		attachments: 0,
		reminderTemplates: 0,
		reminders: 0,
		templateTodos: 0,
		reminderTodos: 0,
		expenses: 0,
		sessions: 0,
		activities: 0,
		activityItems: 0,
		exerciseRecords: 0,
		runningStats: 0,
		trackPoints: 0,
		roadmaps: 0,
		roadmapNodes: 0,
		roadmapEdges: 0,
		tierLists: 0,
		tiers: 0,
		tierEntries: 0,
		ydkDecks: 0,
		ydkEntries: 0,
		timers: 0,
		timerSteps: 0,
		settings: 0,
		skipped: 0
	};

	await db.transaction(async (tx) => {
		// 1. Tags — skip if name already exists
		for (const t of data.tags ?? []) {
			const existing = await findExisting(
				tx,
				tag,
				and(eq(tag.userId, userId), eq(tag.name, t.name))
			);
			if (existing) {
				idMap.set(t.id, existing.id);
				counts.skipped++;
			} else {
				const newId = crypto.randomUUID();
				idMap.set(t.id, newId);
				await tx.insert(tag).values({ id: newId, userId, name: t.name, color: t.color }).run();
				counts.tags++;
			}
		}

		// 2. Categories — skip if name already exists
		for (const cat of data.categories ?? []) {
			const existing = await findExisting(
				tx,
				category,
				and(eq(category.userId, userId), eq(category.name, cat.name))
			);
			let catId: string;
			if (existing) {
				catId = existing.id;
				idMap.set(cat.id, catId);
				counts.skipped++;
			} else {
				catId = crypto.randomUUID();
				idMap.set(cat.id, catId);
				await tx
					.insert(category)
					.values({
						id: catId,
						userId,
						name: cat.name,
						description: cat.description,
						icon: cat.icon,
						iconColor: cat.iconColor,
						accentColor: cat.accentColor,
						backgroundColor: cat.backgroundColor,
						imageUrl: cat.imageUrl,
						position: cat.position
					})
					.run();
				counts.categories++;
			}

			// 3. Pages — skip if name already exists within this category
			for (const pg of cat.pages ?? []) {
				const existingPage = await findExisting(
					tx,
					page,
					and(eq(page.userId, userId), eq(page.categoryId, catId), eq(page.name, pg.name))
				);
				if (existingPage) {
					idMap.set(pg.id, existingPage.id);
					counts.skipped++;
				} else {
					const newPageId = crypto.randomUUID();
					idMap.set(pg.id, newPageId);
					await tx
						.insert(page)
						.values({
							id: newPageId,
							userId,
							categoryId: catId,
							name: pg.name,
							description: pg.description,
							icon: pg.icon,
							iconColor: pg.iconColor,
							accentColor: pg.accentColor,
							backgroundColor: pg.backgroundColor,
							imageUrl: pg.imageUrl,
							coverImageUrl: pg.coverImageUrl,
							markdown: pg.markdown,
							position: pg.position
						})
						.run();
					counts.pages++;
				}
			}
		}

		// 4. Tree elements — skip if name+type already exists (same user)
		for (const el of data.treeElements ?? []) {
			const existing = await findExisting(
				tx,
				treeElement,
				and(
					eq(treeElement.userId, userId),
					eq(treeElement.name, el.name),
					eq(treeElement.type, el.type)
				)
			);
			if (existing) {
				idMap.set(el.id, existing.id);
				counts.skipped++;
			} else {
				const newId = crypto.randomUUID();
				idMap.set(el.id, newId);
				await tx
					.insert(treeElement)
					.values({
						id: newId,
						userId,
						type: el.type,
						name: el.name,
						description: el.description,
						markdown: el.markdown,
						imageUrl: el.imageUrl,
						videoUrl: el.videoUrl,
						externalUrl: el.externalUrl,
						tags: el.tags,
						metadata: el.metadata,
						ydkData: el.ydkData,
						favorite: el.favorite ?? false
					})
					.run();
				counts.elements++;
			}
		}

		// 5. Relationships — only if both parent and child were imported (not skipped)
		for (const rel of data.treeRelationships ?? []) {
			const newParentId = idMap.get(rel.parentId);
			const newChildId = idMap.get(rel.childId);
			if (newParentId && newChildId) {
				const existing = await findExisting(
					tx,
					treeRelationship,
					and(
						eq(treeRelationship.parentType, rel.parentType),
						eq(treeRelationship.parentId, newParentId),
						eq(treeRelationship.childType, rel.childType),
						eq(treeRelationship.childId, newChildId)
					)
				);
				if (!existing) {
					await tx
						.insert(treeRelationship)
						.values({
							parentType: rel.parentType,
							parentId: newParentId,
							childType: rel.childType,
							childId: newChildId,
							position: rel.position
						})
						.run();
					counts.relationships++;
				} else {
					counts.skipped++;
				}
			}
		}

		// 6. Attachments (v2+) — skip if page was skipped (id not mapped to new)
		if (data.attachments) {
			for (const att of data.attachments) {
				const newPageId = idMap.get(att.pageId);
				if (!newPageId) {
					counts.skipped++;
					continue;
				}

				const existing = await findExisting(
					tx,
					attachment,
					and(
						eq(attachment.userId, userId),
						eq(attachment.pageId, newPageId),
						eq(attachment.originalName, att.originalName)
					)
				);
				if (existing) {
					counts.skipped++;
					continue;
				}

				// Write file to disk
				const userDir = path.join(UPLOAD_DIR, userId);
				const ext = path.extname(att.originalName);
				const storedName = `${crypto.randomUUID()}${ext}`;
				const filePath = path.join(userDir, storedName);

				const { mkdirSync } = await import('fs');
				mkdirSync(userDir, { recursive: true });
				const { writeFileSync } = await import('fs');
				writeFileSync(filePath, Buffer.from(att.data, 'base64'));

				await tx
					.insert(attachment)
					.values({
						userId,
						pageId: newPageId,
						originalName: att.originalName,
						storedName,
						mimeType: att.mimeType,
						size: att.size
					})
					.run();
				counts.attachments++;
			}
		}

		// ── v3 domains (absent in v1/v2 files — loops are no-ops) ──────────────

		// 7. Reminder templates — skip if title already exists
		for (const tpl of data.reminderTemplates ?? []) {
			const existing = await findExisting(
				tx,
				reminderTemplate,
				and(eq(reminderTemplate.userId, userId), eq(reminderTemplate.title, tpl.title))
			);
			let tplId: string;
			if (existing) {
				tplId = existing.id;
				idMap.set(tpl.id, tplId);
				counts.skipped++;
			} else {
				tplId = crypto.randomUUID();
				idMap.set(tpl.id, tplId);
				await tx
					.insert(reminderTemplate)
					.values({
						id: tplId,
						userId,
						title: tpl.title,
						description: tpl.description,
						markdown: tpl.markdown,
						icon: tpl.icon,
						iconColor: tpl.iconColor,
						recurrenceType: tpl.recurrenceType,
						recurrenceConfig: tpl.recurrenceConfig,
						nextDueAt: toDate(tpl.nextDueAt),
						active: tpl.active ?? true,
						position: tpl.position ?? 0
					})
					.run();
				counts.reminderTemplates++;
			}

			for (const td of tpl.todos ?? []) {
				const existingTodo = await findExisting(
					tx,
					reminderTemplateTodo,
					and(eq(reminderTemplateTodo.templateId, tplId), eq(reminderTemplateTodo.text, td.text))
				);
				if (existingTodo) {
					counts.skipped++;
				} else {
					await tx
						.insert(reminderTemplateTodo)
						.values({ templateId: tplId, text: td.text, position: td.position ?? 0 })
						.run();
					counts.templateTodos++;
				}
			}
		}

		// 8. Reminders — skip if template+dueAt already exists
		for (const rem of data.reminders ?? []) {
			const newTemplateId = idMap.get(rem.templateId);
			if (!newTemplateId) {
				counts.skipped++;
				continue;
			}
			const dueAt = toDate(rem.dueAt)!;
			const existing = await findExisting(
				tx,
				reminder,
				and(
					eq(reminder.userId, userId),
					eq(reminder.templateId, newTemplateId),
					eq(reminder.dueAt, dueAt)
				)
			);
			let remId: string;
			if (existing) {
				remId = existing.id;
				idMap.set(rem.id, remId);
				counts.skipped++;
			} else {
				remId = crypto.randomUUID();
				idMap.set(rem.id, remId);
				await tx
					.insert(reminder)
					.values({
						id: remId,
						userId,
						templateId: newTemplateId,
						title: rem.title,
						description: rem.description,
						markdown: rem.markdown,
						dueAt,
						completed: rem.completed ?? false,
						completedAt: toDate(rem.completedAt),
						snoozedUntil: toDate(rem.snoozedUntil)
					})
					.run();
				counts.reminders++;
			}

			for (const td of rem.todos ?? []) {
				const existingTodo = await findExisting(
					tx,
					reminderTodo,
					and(eq(reminderTodo.reminderId, remId), eq(reminderTodo.text, td.text))
				);
				if (existingTodo) {
					counts.skipped++;
				} else {
					await tx
						.insert(reminderTodo)
						.values({
							reminderId: remId,
							text: td.text,
							completed: td.completed ?? false,
							position: td.position ?? 0
						})
						.run();
					counts.reminderTodos++;
				}
			}
		}

		// 9. Expenses — skip if amount+spentAt already exists
		for (const exp of data.expenses ?? []) {
			const spentAt = toDate(exp.spentAt)!;
			const existing = await findExisting(
				tx,
				expense,
				and(
					eq(expense.userId, userId),
					eq(expense.amount, exp.amount),
					eq(expense.spentAt, spentAt)
				)
			);
			if (existing) {
				counts.skipped++;
			} else {
				await tx
					.insert(expense)
					.values({
						userId,
						amount: exp.amount,
						currency: exp.currency,
						description: exp.description,
						markdown: exp.markdown,
						tags: exp.tags,
						spentAt
					})
					.run();
				counts.expenses++;
			}
		}

		// 10. User settings — only fill in if the account has none
		if (data.userSettings) {
			const existing = await findExisting(tx, userSettings, eq(userSettings.userId, userId));
			if (!existing) {
				await tx
					.insert(userSettings)
					.values({
						userId,
						currency: data.userSettings.currency ?? 'DZD',
						currencyRate: data.userSettings.currencyRate ?? 1,
						monthlySpendingLimit: data.userSettings.monthlySpendingLimit ?? null
					})
					.run();
				counts.settings++;
			} else {
				counts.skipped++;
			}
		}

		// 11. Training — sessions → activities → items / records / running + track points
		for (const sess of data.training?.sessions ?? []) {
			const startedAt = toDate(sess.startedAt)!;
			const existingSess = await findExisting(
				tx,
				trainingSession,
				and(
					eq(trainingSession.userId, userId),
					eq(trainingSession.startedAt, startedAt),
					eq(trainingSession.title, sess.title ?? '')
				)
			);
			let sessId: string;
			if (existingSess) {
				sessId = existingSess.id;
				idMap.set(sess.id, sessId);
				counts.skipped++;
			} else {
				sessId = crypto.randomUUID();
				idMap.set(sess.id, sessId);
				await tx
					.insert(trainingSession)
					.values({
						id: sessId,
						userId,
						title: sess.title,
						notes: sess.notes,
						status: sess.status ?? 'completed',
						startedAt,
						endedAt: toDate(sess.endedAt),
						duration: sess.duration
					})
					.run();
				counts.sessions++;
			}

			for (const act of sess.activities ?? []) {
				const actStartedAt = toDate(act.startedAt)!;
				const existingAct = await findExisting(
					tx,
					trainingActivity,
					and(
						eq(trainingActivity.sessionId, sessId),
						eq(trainingActivity.startedAt, actStartedAt),
						eq(trainingActivity.type, act.type)
					)
				);
				let actId: string;
				if (existingAct) {
					actId = existingAct.id;
					idMap.set(act.id, actId);
					counts.skipped++;
				} else {
					actId = crypto.randomUUID();
					idMap.set(act.id, actId);
					await tx
						.insert(trainingActivity)
						.values({
							id: actId,
							sessionId: sessId,
							type: act.type,
							startedAt: actStartedAt,
							endedAt: toDate(act.endedAt),
							notes: act.notes
						})
						.run();
					counts.activities++;
				}

				for (const li of act.items ?? []) {
					const newItemId = idMap.get(li.itemId);
					if (!newItemId) {
						counts.skipped++;
						continue;
					}
					const existingLink = await findExisting(
						tx,
						trainingActivityItem,
						and(
							eq(trainingActivityItem.activityId, actId),
							eq(trainingActivityItem.itemId, newItemId)
						)
					);
					if (existingLink) {
						counts.skipped++;
					} else {
						await tx
							.insert(trainingActivityItem)
							.values({ activityId: actId, itemId: newItemId })
							.run();
						counts.activityItems++;
					}
				}

				for (const er of act.exerciseRecords ?? []) {
					const newItemId = idMap.get(er.itemId);
					if (!newItemId) {
						counts.skipped++;
						continue;
					}
					const existingRec = await findExisting(
						tx,
						trainingExerciseRecord,
						and(
							eq(trainingExerciseRecord.activityId, actId),
							eq(trainingExerciseRecord.itemId, newItemId),
							eq(trainingExerciseRecord.position, er.position ?? 0)
						)
					);
					if (existingRec) {
						counts.skipped++;
					} else {
						await tx
							.insert(trainingExerciseRecord)
							.values({
								activityId: actId,
								itemId: newItemId,
								sets: er.sets,
								reps: er.reps,
								weight: er.weight,
								unit: er.unit,
								rpe: er.rpe,
								restTime: er.restTime,
								notes: er.notes,
								position: er.position ?? 0
							})
							.run();
						counts.exerciseRecords++;
					}
				}

				if (act.running) {
					const existingRun = await findExisting(
						tx,
						runningActivity,
						eq(runningActivity.activityId, actId)
					);
					if (existingRun) {
						counts.skipped++;
					} else {
						await tx
							.insert(runningActivity)
							.values({
								activityId: actId,
								distance: act.running.distance,
								elapsedDuration: act.running.elapsedDuration,
								movingDuration: act.running.movingDuration,
								averageSpeed: act.running.averageSpeed,
								maxSpeed: act.running.maxSpeed,
								averagePace: act.running.averagePace,
								bestPace: act.running.bestPace,
								elevationGain: act.running.elevationGain,
								elevationLoss: act.running.elevationLoss
							})
							.run();
						counts.runningStats++;

						const points = (act.running.trackPoints ?? []).map(
							(p: {
								sequence: number;
								timestamp: string | number | Date;
								latitude: number;
								longitude: number;
								altitude?: number | null;
								accuracy?: number | null;
								speed?: number | null;
								heading?: number | null;
							}) => ({
								activityId: actId,
								sequence: p.sequence,
								timestamp: toDate(p.timestamp)!,
								latitude: p.latitude,
								longitude: p.longitude,
								altitude: p.altitude ?? null,
								accuracy: p.accuracy ?? null,
								speed: p.speed ?? null,
								heading: p.heading ?? null
							})
						);
						for (let i = 0; i < points.length; i += 500) {
							await tx
								.insert(runningTrackPoint)
								.values(points.slice(i, i + 500))
								.run();
						}
						counts.trackPoints += points.length;
					}
				}
			}
		}

		// 12. Roadmaps — nodes remap items, edges remap node ids
		for (const rm of data.roadmaps ?? []) {
			const existingRm = await findExisting(
				tx,
				roadmap,
				and(eq(roadmap.userId, userId), eq(roadmap.name, rm.name))
			);
			let rmId: string;
			if (existingRm) {
				rmId = existingRm.id;
				idMap.set(rm.id, rmId);
				counts.skipped++;
			} else {
				rmId = crypto.randomUUID();
				idMap.set(rm.id, rmId);
				await tx
					.insert(roadmap)
					.values({ id: rmId, userId, name: rm.name, description: rm.description })
					.run();
				counts.roadmaps++;
			}

			for (const node of rm.nodes ?? []) {
				const existingNode = await findExisting(
					tx,
					roadmapNode,
					and(eq(roadmapNode.roadmapId, rmId), eq(roadmapNode.label, node.label))
				);
				if (existingNode) {
					idMap.set(node.id, existingNode.id);
					counts.skipped++;
				} else {
					const nodeId = crypto.randomUUID();
					idMap.set(node.id, nodeId);
					await tx
						.insert(roadmapNode)
						.values({
							id: nodeId,
							roadmapId: rmId,
							itemId: node.itemId ? (idMap.get(node.itemId) ?? null) : null,
							label: node.label,
							status: node.status ?? 'pending',
							progress: node.progress ?? 0,
							x: node.x ?? 0,
							y: node.y ?? 0
						})
						.run();
					counts.roadmapNodes++;
				}
			}

			for (const edge of rm.edges ?? []) {
				const sourceId = idMap.get(edge.sourceId);
				const targetId = idMap.get(edge.targetId);
				if (!sourceId || !targetId) {
					counts.skipped++;
					continue;
				}
				const existingEdge = await findExisting(
					tx,
					roadmapEdge,
					and(eq(roadmapEdge.sourceId, sourceId), eq(roadmapEdge.targetId, targetId))
				);
				if (existingEdge) {
					counts.skipped++;
				} else {
					await tx.insert(roadmapEdge).values({ roadmapId: rmId, sourceId, targetId }).run();
					counts.roadmapEdges++;
				}
			}
		}

		// 13. Tier lists — entries remap items
		for (const list of data.tierLists ?? []) {
			const existingList = await findExisting(
				tx,
				tierList,
				and(eq(tierList.userId, userId), eq(tierList.name, list.name))
			);
			let listId: string;
			if (existingList) {
				listId = existingList.id;
				idMap.set(list.id, listId);
				counts.skipped++;
			} else {
				listId = crypto.randomUUID();
				idMap.set(list.id, listId);
				await tx
					.insert(tierList)
					.values({ id: listId, userId, name: list.name, description: list.description })
					.run();
				counts.tierLists++;
			}

			for (const tier of list.tiers ?? []) {
				const existingTier = await findExisting(
					tx,
					tierListTier,
					and(eq(tierListTier.tierListId, listId), eq(tierListTier.label, tier.label))
				);
				let tierId: string;
				if (existingTier) {
					tierId = existingTier.id;
					idMap.set(tier.id, tierId);
					counts.skipped++;
				} else {
					tierId = crypto.randomUUID();
					idMap.set(tier.id, tierId);
					await tx
						.insert(tierListTier)
						.values({
							id: tierId,
							tierListId: listId,
							label: tier.label,
							color: tier.color ?? '#808080',
							position: tier.position ?? 0
						})
						.run();
					counts.tiers++;
				}

				for (const entry of tier.entries ?? []) {
					const newItemId = idMap.get(entry.itemId);
					if (!newItemId) {
						counts.skipped++;
						continue;
					}
					const existingEntry = await findExisting(
						tx,
						tierListEntry,
						and(eq(tierListEntry.tierId, tierId), eq(tierListEntry.itemId, newItemId))
					);
					if (existingEntry) {
						counts.skipped++;
					} else {
						await tx
							.insert(tierListEntry)
							.values({ tierId, itemId: newItemId, position: entry.position ?? 0 })
							.run();
						counts.tierEntries++;
					}
				}
			}
		}

		// 14. YDK decks
		for (const deck of data.ydkDecks ?? []) {
			const existingDeck = await findExisting(
				tx,
				ydkDeck,
				and(eq(ydkDeck.userId, userId), eq(ydkDeck.name, deck.name))
			);
			let deckId: string;
			if (existingDeck) {
				deckId = existingDeck.id;
				idMap.set(deck.id, deckId);
				counts.skipped++;
			} else {
				deckId = crypto.randomUUID();
				idMap.set(deck.id, deckId);
				await tx.insert(ydkDeck).values({ id: deckId, userId, name: deck.name }).run();
				counts.ydkDecks++;
			}

			for (const entry of deck.entries ?? []) {
				const existingEntry = await findExisting(
					tx,
					ydkEntry,
					and(
						eq(ydkEntry.deckId, deckId),
						eq(ydkEntry.section, entry.section),
						eq(ydkEntry.cardId, entry.cardId),
						eq(ydkEntry.position, entry.position ?? 0)
					)
				);
				if (existingEntry) {
					counts.skipped++;
				} else {
					await tx
						.insert(ydkEntry)
						.values({
							deckId,
							section: entry.section,
							cardId: entry.cardId,
							position: entry.position ?? 0
						})
						.run();
					counts.ydkEntries++;
				}
			}
		}

		// 15. HIIT / WOD timers — nested steps (groups + children)
		for (const tpl of data.timers ?? []) {
			const existingTpl = await findExisting(
				tx,
				timerTemplate,
				and(eq(timerTemplate.userId, userId), eq(timerTemplate.name, tpl.name))
			);
			let tplId: string;
			if (existingTpl) {
				tplId = existingTpl.id;
				idMap.set(tpl.id, tplId);
				counts.skipped++;
			} else {
				tplId = crypto.randomUUID();
				idMap.set(tpl.id, tplId);
				await tx
					.insert(timerTemplate)
					.values({
						id: tplId,
						userId,
						name: tpl.name,
						description: tpl.description,
						rounds: tpl.rounds ?? 1
					})
					.run();
				counts.timers++;
			}

			// Steps are stored as a nested tree; insert breadth-first so
			// parents exist before children reference them. When the template
			// already existed its steps are left untouched.
			if (!existingTpl) {
				type StepIn = {
					kind: string;
					label: string;
					durationSec?: number | null;
					groupRounds?: number | null;
					position?: number;
					children?: StepIn[];
				};
				type FlatStep = {
					kind: string;
					label: string;
					durationSec: number | null;
					groupRounds: number | null;
					position: number;
					parentRef: number | null;
					ref: number;
				};
				const flat: FlatStep[] = [];
				const walk = (steps: StepIn[], parentRef: number | null) => {
					steps.forEach((step, i) => {
						const ref = flat.length;
						flat.push({
							kind: step.kind,
							label: step.label,
							durationSec: step.durationSec ?? null,
							groupRounds: step.groupRounds ?? null,
							position: step.position ?? i,
							parentRef,
							ref
						});
						if (step.children && step.children.length > 0) walk(step.children, ref);
					});
				};
				walk(tpl.steps ?? [], null);

				const stepIds = new Map<number, string>();
				for (const step of flat) {
					const parentId = step.parentRef != null ? (stepIds.get(step.parentRef) ?? null) : null;
					const stepId = crypto.randomUUID();
					stepIds.set(step.ref, stepId);
					await tx
						.insert(timerStep)
						.values({
							id: stepId,
							timerTemplateId: tplId,
							parentId,
							kind: step.kind as 'start' | 'normal' | 'info' | 'silent' | 'end' | 'group',
							label: step.label,
							durationSec: step.durationSec,
							groupRounds: step.groupRounds,
							position: step.position
						})
						.run();
					counts.timerSteps++;
				}
			}
		}
	});

	// Wikilinks are derived data: rebuild every document's edges from the
	// imported markdown rather than trusting anything in the backup file.
	await rebuildAllDocLinks(userId);

	const imported =
		counts.categories +
		counts.pages +
		counts.elements +
		counts.relationships +
		counts.tags +
		counts.attachments +
		counts.reminderTemplates +
		counts.reminders +
		counts.templateTodos +
		counts.reminderTodos +
		counts.expenses +
		counts.sessions +
		counts.activities +
		counts.activityItems +
		counts.exerciseRecords +
		counts.runningStats +
		counts.trackPoints +
		counts.roadmaps +
		counts.roadmapNodes +
		counts.roadmapEdges +
		counts.tierLists +
		counts.tiers +
		counts.tierEntries +
		counts.ydkDecks +
		counts.ydkEntries +
		counts.timers +
		counts.timerSteps +
		counts.settings;
	return {
		success: true,
		message:
			counts.skipped > 0
				? `Imported ${imported} items, skipped ${counts.skipped} duplicates`
				: `Imported ${imported} items successfully`,
		counts
	};
}
