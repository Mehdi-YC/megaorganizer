import { db } from '$lib/server/db';
import { reminder, reminderTemplate } from '$lib/server/db/schema';
import { and, eq, isNull, lte, gte, or } from 'drizzle-orm';
import { generateDueReminders } from './reminder.service';
import { sendToUser } from './push.service';

const TICK_MS = 60_000;
// Push only fires for reminders due within this window, so enabling push
// on a device never replays months of overdue history.
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

let started = false;

export function startScheduler(): void {
	if (started) return;
	started = true;
	setInterval(() => {
		void runReminderTick();
	}, TICK_MS);
	void runReminderTick();
}

/**
 * One scheduler pass: materialize due recurring reminders for every user
 * with active templates, then push each due, undelivered reminder once.
 * Exported for tests.
 */
export async function runReminderTick(): Promise<void> {
	try {
		const users = await db
			.selectDistinct({ userId: reminderTemplate.userId })
			.from(reminderTemplate)
			.where(eq(reminderTemplate.active, true))
			.all();
		for (const user of users) {
			await generateDueReminders(user.userId);
		}

		const cutoff = new Date(Date.now() - RECENT_WINDOW_MS);
		const now = new Date();
		const due = await db
			.select()
			.from(reminder)
			.where(
				and(
					eq(reminder.completed, false),
					isNull(reminder.notifiedAt),
					lte(reminder.dueAt, now),
					gte(reminder.dueAt, cutoff),
					// Snoozed reminders come back once the snooze has expired.
					or(isNull(reminder.snoozedUntil), lte(reminder.snoozedUntil, now))
				)
			)
			.all();

		for (const r of due) {
			const sent = await sendToUser(r.userId, {
				title: r.title,
				body: r.description ?? undefined,
				tag: `reminder-${r.id}`,
				url: `/app/reminders/${r.id}`,
				reminderId: r.id
			});
			// Mark only what a device actually received. Undelivered reminders
			// stay pending and are retried on the next tick instead of being
			// silently swallowed (e.g. before push was enabled on a phone).
			if (sent > 0) {
				await db
					.update(reminder)
					.set({ notifiedAt: new Date(), snoozedUntil: null })
					.where(eq(reminder.id, r.id));
			}
		}
	} catch (err) {
		console.error('reminder scheduler tick failed:', err);
	}
}
