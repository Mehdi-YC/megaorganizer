import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import {
	user,
	exercise,
	treeElement,
	trainingSession,
	trainingActivity,
	trainingExerciseRecord
} from '$lib/server/db/schema';
import {
	createTrainingSession,
	createTrainingActivity,
	batchCreateExerciseRecords,
	getExerciseRecordsBySession
} from '$lib/server/services/training.service';
import { createExercise } from '$lib/server/services/exercise.service';

const TEST_USER = 'test-user-records';
const OTHER_USER = 'test-user-records-other';

async function seedUser(id: string) {
	await db
		.insert(user)
		.values({ id, name: 'Test User', email: `${id}@example.com`, emailVerified: true })
		.run();
}

describe('session exercise records', () => {
	beforeEach(async () => {
		await db.delete(trainingExerciseRecord).run();
		await db.delete(trainingActivity).run();
		await db.delete(trainingSession).run();
		await db.delete(treeElement).run();
		await db.delete(exercise).run();
		await db.delete(user).run();
		await seedUser(TEST_USER);
		await seedUser(OTHER_USER);
	});

	it('returns logged records with resolved names, ordered by position', async () => {
		const custom = await createExercise(TEST_USER, { name: 'Bench Press', muscleGroup: 'chest' });
		const [item] = await db
			.insert(treeElement)
			.values({ userId: TEST_USER, type: 'item', name: 'Old Library Item' })
			.returning();

		const session = await createTrainingSession(TEST_USER, { startedAt: new Date() });
		const activity = await createTrainingActivity(TEST_USER, session.id, {
			type: 'strength',
			startedAt: new Date()
		});

		await batchCreateExerciseRecords(TEST_USER, activity!.id, [
			{ exerciseId: custom!.id, sets: 4, reps: '6-8', weight: 60, unit: 'kg', position: 1 },
			{ itemId: item.id, sets: 3, reps: '10', weight: 20, position: 0 }
		]);

		const records = await getExerciseRecordsBySession(TEST_USER, session.id);
		expect(records.length).toBe(2);
		// Ordered by position: the item record first.
		expect(records[0].name).toBe('Old Library Item');
		expect(records[0].sets).toBe(3);
		expect(records[1].name).toBe('Bench Press');
		expect(records[1].reps).toBe('6-8');
		expect(records[1].weight).toBe(60);
	});

	it('scopes records to the owning user', async () => {
		const custom = await createExercise(TEST_USER, { name: 'Squat', muscleGroup: 'quadriceps' });
		const session = await createTrainingSession(TEST_USER, { startedAt: new Date() });
		const activity = await createTrainingActivity(TEST_USER, session.id, {
			type: 'strength',
			startedAt: new Date()
		});
		await batchCreateExerciseRecords(TEST_USER, activity!.id, [
			{ exerciseId: custom!.id, sets: 5, reps: '5', weight: 100 }
		]);

		expect((await getExerciseRecordsBySession(TEST_USER, session.id)).length).toBe(1);
		expect(await getExerciseRecordsBySession(OTHER_USER, session.id)).toEqual([]);
	});
});
