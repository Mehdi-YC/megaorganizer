import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { reminder, reminderTemplate, user } from '$lib/server/db/schema';
import { generateDueReminders } from '$lib/server/services/reminder.service';

const USER = 'test-user-reminder-catchup';

function daysAgo(days: number) {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
}

describe('generateDueReminders catch-up', () => {
	beforeEach(async () => {
		await db.delete(reminder).run();
		await db.delete(reminderTemplate).run();
		await db.delete(user).run();
		await db
			.insert(user)
			.values({ id: USER, name: 'Reminder User', email: 'rem@example.com', emailVerified: true })
			.run();
	});

	it('creates every missed occurrence in one pass', async () => {
		await db.insert(reminderTemplate).values({
			userId: USER,
			title: 'Daily standup',
			recurrenceType: 'daily',
			recurrenceConfig: '{}',
			nextDueAt: daysAgo(3)
		});

		const created = await generateDueReminders(USER);

		// Three occurrences inside the catch-up window (today and the two
		// previous days), then nextDueAt moves into the future.
		expect(created).toBeGreaterThanOrEqual(3);
		expect(created).toBeLessThanOrEqual(4);

		const [template] = await db.select().from(reminderTemplate);
		expect(template.nextDueAt!.getTime()).toBeGreaterThanOrEqual(Date.now() - 24 * 60 * 60 * 1000);

		const instances = await db.select().from(reminder);
		expect(instances).toHaveLength(created);
	});

	it('does not backfill occurrences older than the catch-up window', async () => {
		await db.insert(reminderTemplate).values({
			userId: USER,
			title: 'Ancient daily',
			recurrenceType: 'daily',
			recurrenceConfig: '{}',
			nextDueAt: daysAgo(40)
		});

		const created = await generateDueReminders(USER);

		// A week of instances at most, not forty.
		expect(created).toBeLessThanOrEqual(8);
		const [template] = await db.select().from(reminderTemplate);
		expect(template.nextDueAt!.getTime()).toBeGreaterThanOrEqual(Date.now() - 24 * 60 * 60 * 1000);
	});

	it('leaves a future template untouched', async () => {
		const future = new Date();
		future.setDate(future.getDate() + 2);
		await db.insert(reminderTemplate).values({
			userId: USER,
			title: 'In two days',
			recurrenceType: 'daily',
			recurrenceConfig: '{}',
			nextDueAt: future
		});

		expect(await generateDueReminders(USER)).toBe(0);
		expect(await db.select().from(reminder)).toHaveLength(0);
	});
});
