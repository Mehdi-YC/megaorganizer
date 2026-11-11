import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import {
	user,
	exercise,
	trainingSession,
	trainingActivity,
	trainingExerciseRecord
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	listExercises,
	getExercise,
	createExercise,
	updateExercise,
	deleteExercise,
	saveExerciseImage,
	deleteExerciseImage,
	getExerciseImageFile,
	getPersonalRecords,
	ensureBuiltInExercises
} from '$lib/server/services/exercise.service';
import {
	createTrainingSession,
	createTrainingActivity,
	batchCreateExerciseRecords
} from '$lib/server/services/training.service';

const TEST_USER = 'test-user-exercise';
const OTHER_USER = 'test-user-exercise-other';

async function seedUser(id: string) {
	await db
		.insert(user)
		.values({ id, name: 'Test User', email: `${id}@example.com`, emailVerified: true })
		.run();
}

describe('exercise service', () => {
	beforeEach(async () => {
		await db.delete(trainingExerciseRecord).run();
		await db.delete(trainingActivity).run();
		await db.delete(trainingSession).run();
		await db.delete(exercise).run();
		await db.delete(user).run();
		await seedUser(TEST_USER);
		await seedUser(OTHER_USER);
	});

	it('seeds the built-in catalog on first read', async () => {
		const before = await db.select().from(exercise).all();
		expect(before.length).toBe(0);

		const exercises = await listExercises(TEST_USER);
		expect(exercises.length).toBeGreaterThan(50);
		expect(exercises.every((e) => e.isBuiltIn)).toBe(true);
		expect(exercises.every((e) => e.images.length > 0)).toBe(true);

		// Idempotent: a second read must not duplicate rows.
		await ensureBuiltInExercises();
		const after = await db.select().from(exercise).all();
		expect(after.length).toBe(exercises.length);
	});

	it('lists built-ins and own exercises, filters by group and search', async () => {
		const custom = await createExercise(TEST_USER, {
			name: 'My Weird Press',
			muscleGroup: 'chest',
			equipment: 'bands'
		});
		expect(custom).not.toBeNull();

		const all = await listExercises(TEST_USER);
		expect(all.some((e) => e.id === custom!.id)).toBe(true);

		const chest = await listExercises(TEST_USER, { muscleGroup: 'chest' });
		expect(chest.every((e) => e.muscleGroup === 'chest')).toBe(true);
		expect(chest.some((e) => e.name === 'My Weird Press')).toBe(true);

		const found = await listExercises(TEST_USER, { search: 'weird' });
		expect(found.length).toBe(1);
		expect(found[0].name).toBe('My Weird Press');

		// Other users never see someone's custom exercises.
		const foreign = await listExercises(OTHER_USER, { search: 'weird' });
		expect(foreign.length).toBe(0);
	});

	it('updates and deletes only user-owned exercises', async () => {
		const custom = await createExercise(TEST_USER, { name: 'Custom', muscleGroup: 'biceps' });
		const updated = await updateExercise(TEST_USER, custom!.id, {
			name: 'Custom Renamed',
			muscleGroup: 'triceps'
		});
		expect(updated?.name).toBe('Custom Renamed');
		expect(updated?.muscleGroup).toBe('triceps');

		// A built-in row is shared and therefore read-only.
		const builtIn = (await listExercises(TEST_USER)).find((e) => e.isBuiltIn)!;
		expect(await updateExercise(TEST_USER, builtIn.id, { name: 'Hacked' })).toBeNull();
		expect(await deleteExercise(TEST_USER, builtIn.id)).toBe(false);

		// Ownership: another user cannot delete it either.
		expect(await deleteExercise(OTHER_USER, custom!.id)).toBe(false);
		expect(await deleteExercise(TEST_USER, custom!.id)).toBe(true);
		expect(await getExercise(TEST_USER, custom!.id)).toBeNull();
	});

	it('stores and serves uploaded exercise images', async () => {
		const custom = await createExercise(TEST_USER, { name: 'With Image' });
		const png = new File([new Uint8Array([137, 80, 78, 71])], 'pose.png', {
			type: 'image/png'
		});

		const result = await saveExerciseImage(TEST_USER, custom!.id, png);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.images.length).toBe(1);

		const stored = await db.select().from(exercise).where(eq(exercise.id, custom!.id)).get();
		expect(stored?.imageFiles).toContain('.png');

		const file = await getExerciseImageFile(
			TEST_USER,
			custom!.id,
			JSON.parse(stored!.imageFiles!)[0].storedName
		);
		expect(file).not.toBeNull();
		expect(file?.mimeType).toBe('image/png');

		// Other users cannot fetch the file.
		const foreign = await getExerciseImageFile(
			OTHER_USER,
			custom!.id,
			JSON.parse(stored!.imageFiles!)[0].storedName
		);
		expect(foreign).toBeNull();

		const deleted = await deleteExerciseImage(
			TEST_USER,
			custom!.id,
			JSON.parse(stored!.imageFiles!)[0].storedName
		);
		expect(deleted).toBe(true);
		const cleaned = await db.select().from(exercise).where(eq(exercise.id, custom!.id)).get();
		expect(cleaned?.imageFiles).toBe('[]');
	});

	it('computes personal records from logged training records', async () => {
		const custom = await createExercise(TEST_USER, { name: 'Bench', muscleGroup: 'chest' });
		const session = await createTrainingSession(TEST_USER, { startedAt: new Date() });
		const activity = await createTrainingActivity(TEST_USER, session.id, {
			type: 'strength',
			startedAt: new Date()
		});

		await batchCreateExerciseRecords(TEST_USER, activity!.id, [
			{ exerciseId: custom!.id, reps: '7', weight: 50 },
			{ exerciseId: custom!.id, reps: '5', weight: 60 },
			{ exerciseId: custom!.id, reps: '6', weight: 60 },
			{ exerciseId: custom!.id, reps: '6-8', weight: 40 }
		]);

		const prs = await getPersonalRecords(TEST_USER, [custom!.id]);
		const pr = prs.get(custom!.id)!;
		// Heaviest weight wins; best reps at that weight: 6 of 60 kg.
		expect(pr.maxWeight).toBe(60);
		expect(pr.maxReps).toBe(6);
		expect(pr.unit).toBe('kg');

		// Personal records are per user.
		const foreign = await getPersonalRecords(OTHER_USER, [custom!.id]);
		expect(foreign.size).toBe(0);
	});

	it('handles bodyweight records without weights', async () => {
		const custom = await createExercise(TEST_USER, { name: 'Push-Up', muscleGroup: 'chest' });
		const session = await createTrainingSession(TEST_USER, { startedAt: new Date() });
		const activity = await createTrainingActivity(TEST_USER, session.id, {
			type: 'strength',
			startedAt: new Date()
		});

		await batchCreateExerciseRecords(TEST_USER, activity!.id, [
			{ exerciseId: custom!.id, reps: '12' },
			{ exerciseId: custom!.id, reps: '15' }
		]);

		const pr = (await getPersonalRecords(TEST_USER, [custom!.id])).get(custom!.id)!;
		expect(pr.maxWeight).toBeNull();
		expect(pr.maxReps).toBe(15);
	});
});
