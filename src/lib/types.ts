// Shared shapes for data that crosses the client/server boundary.
//
// Most of these exist because the corresponding helper in src/lib/utils was
// typed `any` and the compiler had nothing to check against. They describe
// what the code actually uses, not every column in the schema: the server
// sends full rows, and these are the fields the client touches.

/** A row of the tree_element table, as delivered to a page. */
export interface TreeElement {
	id: string;
	userId?: string;
	/** 'node' groups other elements, 'item' is a leaf. */
	type: 'node' | 'item';
	name: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	videoUrl?: string | null;
	externalUrl?: string | null;
	/** JSON array of tag ids, stored as text. */
	tags?: string | null;
	/** JSON object; see parseMetadata. */
	metadata?: string | null;
	ydkData?: string | null;
	favorite?: boolean | null;
	/** Drizzle maps these to Date on the server; they cross the wire as strings. */
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
	/** Only present on children fetched through getChildren. */
	position?: number;
	/** Only present on nodes assembled by getFullTree / getSubtreeForItem. */
	children?: TreeElement[];
}

/** The shape getFullTree and getSubtreeForItem build: a node with children. */
export type TreeElementNode = TreeElement & { children: TreeElementNode[] };

export interface Tag {
	id: string;
	name: string;
	color?: string | null;
}

/** Anything carrying the fields getAssignedTags and getTagIds read. */
export interface Taggable {
	tags?: string | null;
}

/** Colour and icon overrides parsed out of a node's metadata column. */
export interface NodeMetadata {
	color?: string;
	icon?: string;
	[key: string]: unknown;
}

/** A page row as the sidebar and category pages use it. */
export interface PageSummary {
	id: string;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
	updatedAt?: string | null;
}

/** A category row with its pages nested, as the sidebar expects. */
export interface CategoryWithPages {
	id: string;
	name: string;
	color?: string | null;
	icon?: string | null;
	updatedAt?: string | null;
	pages?: PageSummary[];
}

/** A todo step attached to a reminder template. */
export interface ReminderTodo {
	id: string;
	templateId: string;
	text: string;
	completed: boolean;
	position: number;
}

/** A reminder, as the dashboard and reminder pages consume it. */
export interface Reminder {
	id: string;
	userId?: string;
	/** Null for one-off reminders created via quick capture. */
	templateId?: string | null;
	title: string;
	description?: string | null;
	markdown?: string | null;
	dueAt: Date | string;
	completed: boolean;
	completedAt?: Date | string | null;
	snoozedUntil?: Date | string | null;
	notifiedAt?: Date | string | null;
	/**
	 * Joined in from reminder_template_todo by the query that feeds the
	 * dashboard; not a column on the reminder table itself.
	 */
	todos?: ReminderTodo[];
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
}

/** A finance expense row. */
export interface Expense {
	id: string;
	userId?: string;
	amount: number;
	currency: string;
	description?: string | null;
	markdown?: string | null;
	/** JSON array of tag ids. */
	tags?: string | null;
	spentAt: Date | string;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
}

/** A running-activity GPS point. */
export interface TrackPoint {
	id?: string;
	activityId?: string;
	sequence: number;
	timestamp: Date | string;
	latitude: number;
	longitude: number;
	altitude?: number | null;
	accuracy?: number | null;
	speed?: number | null;
	heading?: number | null;
}

/** A reminder template, including its parsed todo list. */
export interface ReminderTemplate {
	id: string;
	userId?: string;
	name: string;
	title?: string | null;
	description?: string | null;
	markdown?: string | null;
	icon?: string | null;
	iconColor?: string | null;
	color?: string | null;
	/** JSON array of todo steps. */
	todos?: string | null;
	recurrenceType?: string | null;
	/** JSON blob holding the recurrence settings. */
	recurrenceConfig?: string | null;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
}

/** A training session with its activities, as the lists and dashboard show it. */
export interface TrainingSession {
	id: string;
	userId?: string;
	title?: string | null;
	notes?: string | null;
	startedAt: Date | string;
	endedAt?: Date | string | null;
	duration?: number | null;
	/** Names of the activity types in this session, computed by the service. */
	activityTypes?: string[];
	/** Present on the session detail page. */
	trackPoints?: TrackPoint[];
	activities?: { id: string; type: string; [key: string]: unknown }[];
}

/** A running activity, as the session detail page joins it up. */
export interface RunningActivity {
	activityId: string;
	activity?: { id: string; type: string; name?: string | null; [key: string]: unknown };
	runningActivity?: {
		id: string;
		distance?: number | null;
		duration?: number | null;
		elevationGain?: number | null;
		elevationLoss?: number | null;
		[key: string]: unknown;
	} | null;
	trackPoints: TrackPoint[];
}

/** A generated occurrence of a repeating template, shown on the calendar. */
export interface VirtualReminder {
	id: string;
	templateId: string;
	title: string;
	dueAt: Date | string;
	isVirtual: boolean;
}

/** An entry on the calendar, which merges several sources. */
export interface CalendarEvent {
	id: string;
	/** training | reminder | expense | scheduled */
	type: string;
	title?: string | null;
	date: Date | string;
	/** Reminder templates generate repeating instances identified by templateId. */
	templateId?: string;
	[key: string]: unknown;
}

/** Attachment metadata, as the page's attachment grid renders it. */
export interface Attachment {
	id: string;
	originalName: string;
	mimeType: string;
	size: number;
	/** Route that serves the file. Present on attachments the API returns. */
	url: string;
	createdAt?: Date | string | null;
	/**
	 * Coarse kind derived from mimeType on the server (see mimeCategory in
	 * attachment.service): image, video, audio, pdf, or file.
	 */
	category: string;
}
