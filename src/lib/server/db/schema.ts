import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

// ─── Auth ────────────────────────────────────────────────────────────────────
export * from './auth.schema';

// ─── Categories ──────────────────────────────────────────────────────────────
export const category = sqliteTable('category', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	icon: text('icon'),
	iconColor: text('icon_color'),
	accentColor: text('accent_color'),
	backgroundColor: text('background_color'),
	imageUrl: text('image_url'),
	collapsed: integer('collapsed', { mode: 'boolean' }).default(false).notNull(),
	position: integer('position').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull()
});

// ─── Pages ───────────────────────────────────────────────────────────────────
export const page = sqliteTable(
	'page',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		categoryId: text('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		icon: text('icon'),
		iconColor: text('icon_color'),
		accentColor: text('accent_color'),
		backgroundColor: text('background_color'),
		markdown: text('markdown'),
		imageUrl: text('image_url'),
		coverImageUrl: text('cover_image_url'),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('page_categoryId_idx').on(table.categoryId)]
);

// ─── Tree Elements (Nodes + Items) ───────────────────────────────────────────
export const treeElement = sqliteTable(
	'tree_element',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['node', 'item'] }).notNull(),
		name: text('name').notNull(),
		description: text('description'),
		markdown: text('markdown'),
		imageUrl: text('image_url'),
		videoUrl: text('video_url'),
		externalUrl: text('external_url'),
		tags: text('tags'), // JSON array of tag IDs (references tag table)
		metadata: text('metadata'), // JSON object stored as text
		ydkData: text('ydk_data'), // JSON: { mainDeck: string[], extraDeck: string[], sideDeck: string[] }
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('treeElement_userId_idx').on(table.userId),
		index('treeElement_type_idx').on(table.type)
	]
);

// ─── Tree Relationships ──────────────────────────────────────────────────────
export const treeRelationship = sqliteTable(
	'tree_relationship',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		// Parent: can be a page (root), node, or item
		parentType: text('parent_type', { enum: ['page', 'node', 'item'] }).notNull(),
		parentId: text('parent_id').notNull(),
		// Child: can be a node or item
		childType: text('child_type', { enum: ['node', 'item'] }).notNull(),
		childId: text('child_id').notNull(),
		position: integer('position').notNull().default(0)
	},
	(table) => [
		index('treeRelationship_parent_idx').on(table.parentType, table.parentId),
		index('treeRelationship_child_idx').on(table.childType, table.childId)
	]
);

// ─── Tags ────────────────────────────────────────────────────────────────────
export const tag = sqliteTable(
	'tag',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color')
	},
	(table) => [index('tag_userId_idx').on(table.userId)]
);

// ─── Roadmaps ────────────────────────────────────────────────────────────────
export const roadmap = sqliteTable('roadmap', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull()
});

export const roadmapNode = sqliteTable(
	'roadmap_node',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		roadmapId: text('roadmap_id')
			.notNull()
			.references(() => roadmap.id, { onDelete: 'cascade' }),
		itemId: text('item_id').references(() => treeElement.id, { onDelete: 'set null' }),
		label: text('label').notNull(),
		status: text('status', { enum: ['pending', 'in_progress', 'completed'] })
			.default('pending')
			.notNull(),
		progress: integer('progress').default(0).notNull(),
		x: real('x').notNull().default(0),
		y: real('y').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('roadmapNode_roadmapId_idx').on(table.roadmapId)]
);

export const roadmapEdge = sqliteTable(
	'roadmap_edge',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		roadmapId: text('roadmap_id')
			.notNull()
			.references(() => roadmap.id, { onDelete: 'cascade' }),
		sourceId: text('source_id')
			.notNull()
			.references(() => roadmapNode.id, { onDelete: 'cascade' }),
		targetId: text('target_id')
			.notNull()
			.references(() => roadmapNode.id, { onDelete: 'cascade' })
	},
	(table) => [index('roadmapEdge_roadmapId_idx').on(table.roadmapId)]
);

// ─── Tier Lists ──────────────────────────────────────────────────────────────
export const tierList = sqliteTable('tier_list', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull()
});

export const tierListTier = sqliteTable(
	'tier_list_tier',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tierListId: text('tier_list_id')
			.notNull()
			.references(() => tierList.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		color: text('color').notNull().default('#808080'),
		position: integer('position').notNull().default(0)
	},
	(table) => [index('tierListTier_tierListId_idx').on(table.tierListId)]
);

export const tierListEntry = sqliteTable(
	'tier_list_entry',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tierId: text('tier_id')
			.notNull()
			.references(() => tierListTier.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => treeElement.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0)
	},
	(table) => [index('tierListEntry_tierId_idx').on(table.tierId)]
);

// ─── Training ────────────────────────────────────────────────────────────────
export const trainingSession = sqliteTable(
	'training_session',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title'),
		notes: text('notes'),
		status: text('status', {
			enum: ['active', 'paused', 'completed', 'cancelled']
		})
			.default('active')
			.notNull(),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
		endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
		duration: integer('duration'), // in seconds
		sourcePageId: text('source_page_id').references(() => page.id, {
			onDelete: 'set null'
		}),
		sourceNodeId: text('source_node_id').references(() => treeElement.id, {
			onDelete: 'set null'
		}),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('trainingSession_userId_idx').on(table.userId),
		index('trainingSession_startedAt_idx').on(table.startedAt)
	]
);

export const trainingActivity = sqliteTable(
	'training_activity',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		sessionId: text('session_id')
			.notNull()
			.references(() => trainingSession.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: ['strength', 'running', 'cycling', 'walking', 'swimming', 'other']
		}).notNull(),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
		endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('trainingActivity_sessionId_idx').on(table.sessionId)]
);

export const trainingActivityItem = sqliteTable(
	'training_activity_item',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		activityId: text('activity_id')
			.notNull()
			.references(() => trainingActivity.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => treeElement.id, { onDelete: 'cascade' })
	},
	(table) => [index('trainingActivityItem_activityId_idx').on(table.activityId)]
);

// ─── Running ─────────────────────────────────────────────────────────────────
export const runningActivity = sqliteTable('running_activity', {
	activityId: text('activity_id')
		.primaryKey()
		.references(() => trainingActivity.id, { onDelete: 'cascade' }),
	distance: real('distance'), // in meters
	elapsedDuration: integer('elapsed_duration'), // in seconds
	movingDuration: integer('moving_duration'), // in seconds
	averageSpeed: real('average_speed'), // in m/s
	maxSpeed: real('max_speed'), // in m/s
	averagePace: real('average_pace'), // in seconds per km
	bestPace: real('best_pace'), // in seconds per km
	elevationGain: real('elevation_gain'), // in meters
	elevationLoss: real('elevation_loss') // in meters
});

export const runningTrackPoint = sqliteTable(
	'running_track_point',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		activityId: text('activity_id')
			.notNull()
			.references(() => runningActivity.activityId, { onDelete: 'cascade' }),
		sequence: integer('sequence').notNull(),
		timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
		latitude: real('latitude').notNull(),
		longitude: real('longitude').notNull(),
		altitude: real('altitude'),
		accuracy: real('accuracy'),
		speed: real('speed'),
		heading: real('heading')
	},
	(table) => [
		index('runningTrackPoint_activityId_idx').on(table.activityId),
		index('runningTrackPoint_sequence_idx').on(table.sequence)
	]
);

// ─── Training Exercise Records ───────────────────────────────────────────────
export const trainingExerciseRecord = sqliteTable(
	'training_exercise_record',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		activityId: text('activity_id')
			.notNull()
			.references(() => trainingActivity.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => treeElement.id, { onDelete: 'cascade' }),
		sets: integer('sets'),
		reps: text('reps'), // can be "8" or "6-8"
		weight: real('weight'), // in kg
		unit: text('unit').default('kg'),
		rpe: real('rpe'),
		restTime: integer('rest_time'), // in seconds
		notes: text('notes'),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('trainingExerciseRecord_activityId_idx').on(table.activityId)]
);

// ─── YDK Decks ───────────────────────────────────────────────────────────────
export const ydkDeck = sqliteTable('ydk_deck', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull()
});

export const ydkEntry = sqliteTable(
	'ydk_entry',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		deckId: text('deck_id')
			.notNull()
			.references(() => ydkDeck.id, { onDelete: 'cascade' }),
		section: text('section', { enum: ['main', 'extra', 'side'] }).notNull(),
		cardId: text('card_id').notNull(),
		position: integer('position').notNull().default(0)
	},
	(table) => [index('ydkEntry_deckId_idx').on(table.deckId)]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const categoryRelations = relations(category, ({ one, many }) => ({
	user: one(user, { fields: [category.userId], references: [user.id] }),
	pages: many(page)
}));

export const pageRelations = relations(page, ({ one, many }) => ({
	user: one(user, { fields: [page.userId], references: [user.id] }),
	category: one(category, { fields: [page.categoryId], references: [category.id] }),
	children: many(treeRelationship)
}));

export const treeElementRelations = relations(treeElement, ({ one, many }) => ({
	user: one(user, { fields: [treeElement.userId], references: [user.id] }),
	parentRelationships: many(treeRelationship, { relationName: 'child' }),
	childRelationships: many(treeRelationship, { relationName: 'parent' })
}));

export const treeRelationshipRelations = relations(treeRelationship, ({ one }) => ({
	parentElement: one(treeElement, {
		fields: [treeRelationship.childId],
		references: [treeElement.id],
		relationName: 'child'
	})
}));

export const tagRelations = relations(tag, ({ one }) => ({
	user: one(user, { fields: [tag.userId], references: [user.id] })
}));

export const roadmapRelations = relations(roadmap, ({ one, many }) => ({
	user: one(user, { fields: [roadmap.userId], references: [user.id] }),
	nodes: many(roadmapNode),
	edges: many(roadmapEdge)
}));

export const roadmapNodeRelations = relations(roadmapNode, ({ one, many }) => ({
	roadmap: one(roadmap, { fields: [roadmapNode.roadmapId], references: [roadmap.id] }),
	item: one(treeElement, { fields: [roadmapNode.itemId], references: [treeElement.id] }),
	outgoingEdges: many(roadmapEdge, { relationName: 'source' }),
	incomingEdges: many(roadmapEdge, { relationName: 'target' })
}));

export const roadmapEdgeRelations = relations(roadmapEdge, ({ one }) => ({
	roadmap: one(roadmap, { fields: [roadmapEdge.roadmapId], references: [roadmap.id] }),
	source: one(roadmapNode, {
		fields: [roadmapEdge.sourceId],
		references: [roadmapNode.id],
		relationName: 'source'
	}),
	target: one(roadmapNode, {
		fields: [roadmapEdge.targetId],
		references: [roadmapNode.id],
		relationName: 'target'
	})
}));

export const tierListRelations = relations(tierList, ({ one, many }) => ({
	user: one(user, { fields: [tierList.userId], references: [user.id] }),
	tiers: many(tierListTier)
}));

export const tierListTierRelations = relations(tierListTier, ({ one, many }) => ({
	tierList: one(tierList, { fields: [tierListTier.tierListId], references: [tierList.id] }),
	entries: many(tierListEntry)
}));

export const tierListEntryRelations = relations(tierListEntry, ({ one }) => ({
	tier: one(tierListTier, { fields: [tierListEntry.tierId], references: [tierListTier.id] }),
	item: one(treeElement, { fields: [tierListEntry.itemId], references: [treeElement.id] })
}));

export const trainingSessionRelations = relations(trainingSession, ({ one, many }) => ({
	user: one(user, { fields: [trainingSession.userId], references: [user.id] }),
	activities: many(trainingActivity)
}));

export const trainingActivityRelations = relations(trainingActivity, ({ one, many }) => ({
	session: one(trainingSession, {
		fields: [trainingActivity.sessionId],
		references: [trainingSession.id]
	}),
	items: many(trainingActivityItem),
	exerciseRecords: many(trainingExerciseRecord),
	runningActivity: one(runningActivity)
}));

export const trainingActivityItemRelations = relations(trainingActivityItem, ({ one }) => ({
	activity: one(trainingActivity, {
		fields: [trainingActivityItem.activityId],
		references: [trainingActivity.id]
	}),
	item: one(treeElement, { fields: [trainingActivityItem.itemId], references: [treeElement.id] })
}));

export const runningActivityRelations = relations(runningActivity, ({ one, many }) => ({
	activity: one(trainingActivity, {
		fields: [runningActivity.activityId],
		references: [trainingActivity.id]
	}),
	trackPoints: many(runningTrackPoint)
}));

export const runningTrackPointRelations = relations(runningTrackPoint, ({ one }) => ({
	activity: one(runningActivity, {
		fields: [runningTrackPoint.activityId],
		references: [runningActivity.activityId]
	})
}));

export const trainingExerciseRecordRelations = relations(trainingExerciseRecord, ({ one }) => ({
	activity: one(trainingActivity, {
		fields: [trainingExerciseRecord.activityId],
		references: [trainingActivity.id]
	}),
	item: one(treeElement, {
		fields: [trainingExerciseRecord.itemId],
		references: [treeElement.id]
	})
}));

export const ydkDeckRelations = relations(ydkDeck, ({ one, many }) => ({
	user: one(user, { fields: [ydkDeck.userId], references: [user.id] }),
	entries: many(ydkEntry)
}));

export const ydkEntryRelations = relations(ydkEntry, ({ one }) => ({
	deck: one(ydkDeck, { fields: [ydkEntry.deckId], references: [ydkDeck.id] })
}));

// ─── Re-export user for relations ────────────────────────────────────────────
import { user } from './auth.schema';
