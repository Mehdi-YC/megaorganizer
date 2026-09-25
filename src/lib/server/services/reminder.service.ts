import { db } from '$lib/server/db';
import {
	reminderTemplate,
	reminderTemplateTodo,
	reminder,
	reminderTodo
} from '$lib/server/db/schema';
import { eq, and, or, asc, lte, gte, isNull, inArray } from 'drizzle-orm';

// ─── Recurrence Helpers ──────────────────────────────────────────────────────

interface RecurrenceConfig {
	hour?: number;
	minute?: number;
	days?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
	dayOfMonth?: number;
	month?: number; // 0-11
	day?: number;
	// For yearly_date: specific date every year
	// For monthly_relative: e.g., last Monday of month
	weekday?: number; // 0=Sun, 1=Mon, ..., 6=Sat
	weekdayOrdinal?: number; // 1=first, 2=second, 3=third, 4=fourth, -1=last
	/** IANA timezone the fields above are wall-clock in (written by the client). */
	timeZone?: string;
}

function parseConfig(configStr: string | null): RecurrenceConfig {
	if (!configStr) return {};
	try {
		return JSON.parse(configStr);
	} catch {
		return {};
	}
}

/**
 * Get a specific weekday occurrence in a month
 * e.g., "last Monday of March" or "2nd Tuesday of every month"
 * @param year Year
 * @param month Month (0-11)
 * @param weekday Day of week (0=Sun, 1=Mon, ..., 6=Sat)
 * @param ordinal 1=first, 2=second, 3=third, 4=fourth, -1=last
 */
function getWeekdayOfMonth(
	year: number,
	month: number,
	weekday: number,
	ordinal: number
): Date | null {
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

	if (ordinal === -1) {
		// Last occurrence - search from end of month
		for (let d = lastDay; d >= 1; d--) {
			const date = new Date(Date.UTC(year, month, d));
			if (date.getUTCDay() === weekday) return date;
		}
	} else {
		// Nth occurrence - search from beginning
		let count = 0;
		for (let d = 1; d <= lastDay; d++) {
			const date = new Date(Date.UTC(year, month, d));
			if (date.getUTCDay() === weekday) {
				count++;
				if (count === ordinal) return date;
			}
		}
	}

	return null;
}

// ─── Timezone Helpers ────────────────────────────────────────────────────────
// Recurrence fields (hour/minute/days/...) are wall-clock in the user's
// timezone. Occurrences have to be computed in that zone: doing date math in
// the server's zone (UTC inside Docker) shifts every occurrence by the
// timezone offset. Calendar math below therefore runs on a UTC "calendar"
// Date that only carries year/month/day/time fields, converted to a real
// instant at the edges.

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
	let formatter = zoneFormatters.get(timeZone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		zoneFormatters.set(timeZone, formatter);
	}
	return formatter;
}

/** Wall-clock fields of an instant in `timeZone`, as a UTC calendar Date. */
function toCalendar(instant: Date, timeZone: string): Date {
	const fields: Record<string, number> = {};
	for (const part of zoneFormatter(timeZone).formatToParts(instant)) {
		if (part.type !== 'literal') fields[part.type] = Number(part.value);
	}
	return new Date(
		Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second)
	);
}

/** Offset of `timeZone` at `instant`, in milliseconds (UTC+1 → 3_600_000). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
	const truncated = instant.getTime() - instant.getMilliseconds();
	return toCalendar(instant, timeZone).getTime() - truncated;
}

/** The instant at which the wall-clock time carried by `calendar` happens. */
function fromCalendar(calendar: Date, timeZone: string): Date {
	const wallClock = calendar.getTime();
	// Two passes: a single offset guess is wrong across a DST change.
	const firstGuess = new Date(wallClock - zoneOffsetMs(new Date(wallClock), timeZone));
	return new Date(wallClock - zoneOffsetMs(firstGuess, timeZone));
}

function serverTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function applyTimeOfDay(calendar: Date, config: RecurrenceConfig): void {
	if (config.hour !== undefined) {
		calendar.setUTCHours(config.hour, config.minute ?? 0, 0, 0);
	}
}

function daysInCalendarMonth(calendar: Date): number {
	return new Date(Date.UTC(calendar.getUTCFullYear(), calendar.getUTCMonth() + 1, 0)).getUTCDate();
}

export function calculateNextDueAt(
	currentDueAt: Date,
	recurrenceType: string,
	recurrenceConfig: string | null
): Date {
	const config = parseConfig(recurrenceConfig);
	// Templates saved before the timezone was recorded fall back to the
	// server's zone (the previous behaviour).
	const timeZone = config.timeZone ?? serverTimeZone();
	const next = toCalendar(currentDueAt, timeZone);

	switch (recurrenceType) {
		case 'daily':
			next.setUTCDate(next.getUTCDate() + 1);
			applyTimeOfDay(next, config);
			break;

		case 'weekly': {
			const days = config.days ?? [next.getUTCDay()];
			const currentDay = next.getUTCDay();
			let daysToAdd = 1;

			// Find next matching day
			for (let i = 1; i <= 7; i++) {
				const checkDay = (currentDay + i) % 7;
				if (days.includes(checkDay)) {
					daysToAdd = i;
					break;
				}
			}

			next.setUTCDate(next.getUTCDate() + daysToAdd);
			applyTimeOfDay(next, config);
			break;
		}

		case 'monthly': {
			const targetDay = config.dayOfMonth ?? next.getUTCDate();
			// Step from day 1 so e.g. Jan 31 lands on Feb 28 instead of
			// rolling over into March.
			next.setUTCDate(1);
			next.setUTCMonth(next.getUTCMonth() + 1);
			next.setUTCDate(Math.min(targetDay, daysInCalendarMonth(next)));
			applyTimeOfDay(next, config);
			break;
		}

		case 'yearly': {
			const targetMonth = config.month ?? next.getUTCMonth();
			const targetDay = config.day ?? next.getUTCDate();
			next.setUTCDate(1);
			next.setUTCFullYear(next.getUTCFullYear() + 1);
			next.setUTCMonth(targetMonth);
			next.setUTCDate(Math.min(targetDay, daysInCalendarMonth(next)));
			applyTimeOfDay(next, config);
			break;
		}

		case 'yearly_date': {
			// Specific date every year (e.g., April 6th)
			const ydMonth = config.month ?? 0;
			const ydDay = config.day ?? 1;
			next.setUTCDate(1);
			next.setUTCFullYear(next.getUTCFullYear() + 1);
			next.setUTCMonth(ydMonth);
			next.setUTCDate(Math.min(ydDay, daysInCalendarMonth(next)));
			applyTimeOfDay(next, config);
			break;
		}

		case 'monthly_relative': {
			// e.g., last Monday of March, 2nd Tuesday of every month
			const mrWeekday = config.weekday ?? 1; // Default Monday
			const mrOrdinal = config.weekdayOrdinal ?? -1; // Default last

			// Move to the first day of next month
			const mrNext = new Date(next.getTime());
			mrNext.setUTCDate(1);
			mrNext.setUTCMonth(mrNext.getUTCMonth() + 1);

			// Find the target weekday in that month
			const mrTargetDate = getWeekdayOfMonth(
				mrNext.getUTCFullYear(),
				mrNext.getUTCMonth(),
				mrWeekday,
				mrOrdinal
			);
			if (mrTargetDate) {
				next.setTime(mrTargetDate.getTime());
				applyTimeOfDay(next, config);
			}
			break;
		}

		default:
			// For unknown types, just add 1 day
			next.setUTCDate(next.getUTCDate() + 1);
	}

	return fromCalendar(next, timeZone);
}

/**
 * Stamp the user's timezone onto templates saved before it was recorded, so
 * their recurrence hours keep firing at the user's wall-clock time. Called
 * with the timezone the browser reports.
 */
export async function backfillTemplateTimeZones(userId: string, timeZone: string): Promise<void> {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
	} catch {
		return; // Not a timezone this runtime knows.
	}

	const templates = await db
		.select({ id: reminderTemplate.id, recurrenceConfig: reminderTemplate.recurrenceConfig })
		.from(reminderTemplate)
		.where(eq(reminderTemplate.userId, userId))
		.all();

	for (const template of templates) {
		const config = parseConfig(template.recurrenceConfig);
		if (config.timeZone) continue;
		await db
			.update(reminderTemplate)
			.set({ recurrenceConfig: JSON.stringify({ ...config, timeZone }) })
			.where(eq(reminderTemplate.id, template.id));
	}
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

export async function createReminderTemplate(
	userId: string,
	data: {
		title: string;
		description?: string;
		markdown?: string;
		icon?: string;
		iconColor?: string;
		recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'yearly_date' | 'monthly_relative';
		recurrenceConfig?: string;
		nextDueAt?: Date;
		position?: number;
		todos?: string[]; // Array of todo text strings
	}
) {
	const [template] = await db
		.insert(reminderTemplate)
		.values({
			userId,
			title: data.title,
			description: data.description,
			markdown: data.markdown,
			icon: data.icon ?? 'fa-bell',
			iconColor: data.iconColor,
			recurrenceType: data.recurrenceType,
			recurrenceConfig: data.recurrenceConfig,
			nextDueAt: data.nextDueAt ?? new Date(),
			position: data.position ?? 0
		})
		.returning();

	// Create todos if provided
	if (data.todos && data.todos.length > 0) {
		await db.insert(reminderTemplateTodo).values(
			data.todos.map((text, index) => ({
				templateId: template.id,
				text,
				position: index
			}))
		);
	}

	return getReminderTemplateById(userId, template.id);
}

/** One-off reminder without a template (quick capture). */
export async function createOneOffReminder(
	userId: string,
	data: { title: string; description?: string; markdown?: string; dueAt: Date }
) {
	const [result] = await db
		.insert(reminder)
		.values({
			userId,
			templateId: null,
			title: data.title,
			description: data.description,
			markdown: data.markdown,
			dueAt: data.dueAt
		})
		.returning();
	return result;
}

export async function getReminderTemplates(userId: string) {
	const templates = await db
		.select()
		.from(reminderTemplate)
		.where(eq(reminderTemplate.userId, userId))
		.orderBy(asc(reminderTemplate.position), asc(reminderTemplate.createdAt))
		.all();

	if (templates.length === 0) return [];

	const templateIds = templates.map((t) => t.id);
	const allTodos = await db
		.select()
		.from(reminderTemplateTodo)
		.where(inArray(reminderTemplateTodo.templateId, templateIds))
		.orderBy(asc(reminderTemplateTodo.position))
		.all();

	const todosByTemplate = new Map<string, typeof allTodos>();
	for (const todo of allTodos) {
		const arr = todosByTemplate.get(todo.templateId) ?? [];
		arr.push(todo);
		todosByTemplate.set(todo.templateId, arr);
	}

	return templates.map((t) => ({
		...t,
		todos: todosByTemplate.get(t.id) ?? []
	}));
}

export async function getReminderTemplateById(userId: string, templateId: string) {
	const template = await db
		.select()
		.from(reminderTemplate)
		.where(and(eq(reminderTemplate.id, templateId), eq(reminderTemplate.userId, userId)))
		.get();

	if (!template) return null;

	const todos = await db
		.select()
		.from(reminderTemplateTodo)
		.where(eq(reminderTemplateTodo.templateId, templateId))
		.orderBy(asc(reminderTemplateTodo.position))
		.all();

	return { ...template, todos };
}

export async function updateReminderTemplate(
	userId: string,
	templateId: string,
	data: {
		title?: string;
		description?: string;
		markdown?: string;
		icon?: string;
		iconColor?: string;
		recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'yearly_date' | 'monthly_relative';
		recurrenceConfig?: string;
		nextDueAt?: Date;
		active?: boolean;
		position?: number;
	}
) {
	const [updated] = await db
		.update(reminderTemplate)
		.set({
			...data,
			nextDueAt: data.nextDueAt ? data.nextDueAt : undefined
		})
		.where(and(eq(reminderTemplate.id, templateId), eq(reminderTemplate.userId, userId)))
		.returning();

	return updated;
}

export async function updateReminderTemplateTodos(
	userId: string,
	templateId: string,
	todos: string[]
) {
	// Verify ownership
	const template = await db
		.select({ id: reminderTemplate.id })
		.from(reminderTemplate)
		.where(and(eq(reminderTemplate.id, templateId), eq(reminderTemplate.userId, userId)))
		.get();

	if (!template) return null;

	// Delete existing todos
	await db.delete(reminderTemplateTodo).where(eq(reminderTemplateTodo.templateId, templateId));

	// Insert new todos
	if (todos.length > 0) {
		await db.insert(reminderTemplateTodo).values(
			todos.map((text, index) => ({
				templateId,
				text,
				position: index
			}))
		);
	}

	return getReminderTemplateById(userId, templateId);
}

export async function deleteReminderTemplate(userId: string, templateId: string) {
	await db
		.delete(reminderTemplate)
		.where(and(eq(reminderTemplate.id, templateId), eq(reminderTemplate.userId, userId)));
}

// ─── Instance Generation ─────────────────────────────────────────────────────

export async function generateDueReminders(userId: string): Promise<number> {
	const now = new Date();
	let generated = 0;

	// Find all active templates where nextDueAt <= now
	const dueTemplates = await db
		.select()
		.from(reminderTemplate)
		.where(
			and(
				eq(reminderTemplate.userId, userId),
				eq(reminderTemplate.active, true),
				lte(reminderTemplate.nextDueAt, now)
			)
		)
		.all();

	for (const template of dueTemplates) {
		// Get template todos
		const templateTodos = await db
			.select()
			.from(reminderTemplateTodo)
			.where(eq(reminderTemplateTodo.templateId, template.id))
			.orderBy(asc(reminderTemplateTodo.position))
			.all();

		// Create reminder instance
		const [reminderInstance] = await db
			.insert(reminder)
			.values({
				userId,
				templateId: template.id,
				title: template.title,
				description: template.description,
				markdown: template.markdown,
				dueAt: template.nextDueAt!,
				completed: false
			})
			.returning();

		// Copy todos to instance
		if (templateTodos.length > 0) {
			await db.insert(reminderTodo).values(
				templateTodos.map((todo) => ({
					reminderId: reminderInstance.id,
					text: todo.text,
					completed: false,
					position: todo.position
				}))
			);
		}

		// Calculate next due date
		const nextDueAt = calculateNextDueAt(
			template.nextDueAt!,
			template.recurrenceType,
			template.recurrenceConfig
		);

		await db
			.update(reminderTemplate)
			.set({ nextDueAt })
			.where(eq(reminderTemplate.id, template.id));

		generated++;
	}

	return generated;
}

// ─── Reminder Queries ────────────────────────────────────────────────────────

export async function getDueReminders(userId: string, limit = 20) {
	const now = new Date();

	const dueReminders = await db
		.select()
		.from(reminder)
		.where(
			and(
				eq(reminder.userId, userId),
				eq(reminder.completed, false),
				lte(reminder.dueAt, now),
				// Snoozed reminders come back to the list once the snooze expires.
				or(isNull(reminder.snoozedUntil), lte(reminder.snoozedUntil, now))
			)
		)
		.orderBy(asc(reminder.dueAt))
		.limit(limit)
		.all();

	if (dueReminders.length === 0) return [];

	const reminderIds = dueReminders.map((r) => r.id);
	const allTodos = await db
		.select()
		.from(reminderTodo)
		.where(inArray(reminderTodo.reminderId, reminderIds))
		.orderBy(asc(reminderTodo.position))
		.all();

	const todosByReminder = new Map<string, typeof allTodos>();
	for (const todo of allTodos) {
		const arr = todosByReminder.get(todo.reminderId) ?? [];
		arr.push(todo);
		todosByReminder.set(todo.reminderId, arr);
	}

	return dueReminders.map((r) => ({
		...r,
		todos: todosByReminder.get(r.id) ?? []
	}));
}

export async function getUpcomingReminders(userId: string, days = 7, limit = 20) {
	const now = new Date();
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + days);

	const upcomingReminders = await db
		.select()
		.from(reminder)
		.where(
			and(
				eq(reminder.userId, userId),
				eq(reminder.completed, false),
				gte(reminder.dueAt, now),
				lte(reminder.dueAt, endDate)
			)
		)
		.orderBy(asc(reminder.dueAt))
		.limit(limit)
		.all();

	return upcomingReminders;
}

export async function getReminderHistory(
	userId: string,
	startDate: Date,
	endDate: Date,
	templateId?: string
) {
	const conditions = [
		eq(reminder.userId, userId),
		gte(reminder.dueAt, startDate),
		lte(reminder.dueAt, endDate)
	];

	if (templateId) {
		conditions.push(eq(reminder.templateId, templateId));
	}

	return db
		.select()
		.from(reminder)
		.where(and(...conditions))
		.orderBy(asc(reminder.dueAt))
		.all();
}

/**
 * Generate virtual reminders from templates for a date range
 * Used by the calendar to show upcoming scheduled reminders
 */
export async function getVirtualReminders(userId: string, startDate: Date, endDate: Date) {
	// Get all active templates
	const templates = await db
		.select()
		.from(reminderTemplate)
		.where(and(eq(reminderTemplate.userId, userId), eq(reminderTemplate.active, true)))
		.all();

	const virtualReminders: Array<{
		id: string;
		templateId: string;
		title: string;
		description: string | null;
		dueAt: Date;
		completed: boolean;
		isVirtual: true;
	}> = [];

	for (const template of templates) {
		if (!template.nextDueAt) continue;

		let currentDate = new Date(template.nextDueAt);

		// Generate occurrences within the date range
		// Limit to 100 iterations to prevent infinite loops
		for (let i = 0; i < 100; i++) {
			if (currentDate > endDate) break;

			if (currentDate >= startDate) {
				virtualReminders.push({
					id: `virtual_${template.id}_${currentDate.getTime()}`,
					templateId: template.id,
					title: template.title,
					description: template.description,
					dueAt: new Date(currentDate),
					completed: false,
					isVirtual: true
				});
			}

			// Calculate next occurrence
			currentDate = calculateNextDueAt(
				currentDate,
				template.recurrenceType,
				template.recurrenceConfig
			);
		}
	}

	return virtualReminders.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export async function getReminderById(userId: string, reminderId: string) {
	const reminderData = await db
		.select()
		.from(reminder)
		.where(and(eq(reminder.id, reminderId), eq(reminder.userId, userId)))
		.get();

	if (!reminderData) return null;

	const todos = await db
		.select()
		.from(reminderTodo)
		.where(eq(reminderTodo.reminderId, reminderId))
		.orderBy(asc(reminderTodo.position))
		.all();

	return { ...reminderData, todos };
}

// ─── Reminder Actions ────────────────────────────────────────────────────────

export async function completeReminder(userId: string, reminderId: string) {
	const [updated] = await db
		.update(reminder)
		.set({
			completed: true,
			completedAt: new Date()
		})
		.where(and(eq(reminder.id, reminderId), eq(reminder.userId, userId)))
		.returning();

	return updated;
}

export async function snoozeReminder(userId: string, reminderId: string, until: Date) {
	const [updated] = await db
		.update(reminder)
		// Clearing notifiedAt lets the scheduler alert again once the snooze
		// expires instead of the reminder staying silent forever.
		.set({ snoozedUntil: until, notifiedAt: null })
		.where(and(eq(reminder.id, reminderId), eq(reminder.userId, userId)))
		.returning();

	return updated;
}

export async function updateReminderTodo(userId: string, todoId: string, completed: boolean) {
	// Verify ownership through reminder
	const todo = await db
		.select({ reminderId: reminderTodo.reminderId })
		.from(reminderTodo)
		.innerJoin(reminder, eq(reminderTodo.reminderId, reminder.id))
		.where(and(eq(reminderTodo.id, todoId), eq(reminder.userId, userId)))
		.get();

	if (!todo) return null;

	const [updated] = await db
		.update(reminderTodo)
		.set({ completed })
		.where(eq(reminderTodo.id, todoId))
		.returning();

	return updated;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getReminderStats(userId: string, templateId?: string) {
	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const endOfDay = new Date(startOfDay);
	endOfDay.setDate(endOfDay.getDate() + 1);

	const conditions = [eq(reminder.userId, userId)];
	if (templateId) {
		conditions.push(eq(reminder.templateId, templateId));
	}

	const allReminders = await db
		.select()
		.from(reminder)
		.where(and(...conditions))
		.all();

	const todayReminders = allReminders.filter((r) => r.dueAt >= startOfDay && r.dueAt < endOfDay);

	const completedToday = todayReminders.filter((r) => r.completed).length;
	const totalToday = todayReminders.length;
	const overdue = allReminders.filter((r) => !r.completed && r.dueAt < startOfDay).length;

	// Streak calculation (consecutive days with all reminders completed)
	let streak = 0;
	const checkDate = new Date(startOfDay);
	checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

	while (true) {
		const dayStart = new Date(checkDate);
		const dayEnd = new Date(checkDate);
		dayEnd.setDate(dayEnd.getDate() + 1);

		const dayReminders = allReminders.filter((r) => r.dueAt >= dayStart && r.dueAt < dayEnd);

		if (dayReminders.length === 0) break;

		const allCompleted = dayReminders.every((r) => r.completed);
		if (!allCompleted) break;

		streak++;
		checkDate.setDate(checkDate.getDate() - 1);
	}

	return {
		totalToday,
		completedToday,
		overdue,
		streak
	};
}
