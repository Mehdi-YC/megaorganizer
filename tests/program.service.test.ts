import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '$lib/server/db';
import { user, exercise, program, programBlock, programEntry } from '$lib/server/db/schema';
import {
	createProgram,
	getPrograms,
	getProgram,
	updateProgram,
	deleteProgram,
	createBlock,
	updateBlock,
	deleteBlock,
	createEntry,
	updateEntry,
	deleteEntry,
	getProgramOccurrences,
	getProgramBlockForSession
} from '$lib/server/services/program.service';
import { createExercise } from '$lib/server/services/exercise.service';

const TEST_USER = 'test-user-program';
const OTHER_USER = 'test-user-program-other';

async function seedUser(id: string) {
	await db
		.insert(user)
		.values({ id, name: 'Test User', email: `${id}@example.com`, emailVerified: true })
		.run();
}

describe('program service', () => {
	beforeEach(async () => {
		await db.delete(programEntry).run();
		await db.delete(programBlock).run();
		await db.delete(program).run();
		await db.delete(exercise).run();
		await db.delete(user).run();
		await seedUser(TEST_USER);
		await seedUser(OTHER_USER);
	});

	it('creates programs and summarizes their blocks', async () => {
		const p = await createProgram(TEST_USER, { name: 'Upper / Lower', description: '4 days' });
		expect(p.name).toBe('Upper / Lower');

		await createBlock(TEST_USER, p.id, { title: 'Pecs', weekdays: [0, 4] });
		const b2 = await createBlock(TEST_USER, p.id, { title: 'Back', weekdays: [1] });
		await createEntry(TEST_USER, b2!.id, { kind: 'exercise', sets: 3, reps: '8' });
		await createEntry(TEST_USER, b2!.id, { kind: 'title', title: 'Superset' });

		const items = await getPrograms(TEST_USER);
		expect(items.length).toBe(1);
		expect(items[0].blockCount).toBe(2);
		// Title rows are separators, not exercises.
		expect(items[0].exerciseCount).toBe(1);
		expect(items[0].weekdays).toEqual([0, 1, 4]);
	});

	it('returns blocks and entries ordered, with exercise info', async () => {
		const p = await createProgram(TEST_USER, { name: 'Push Day' });
		const block = await createBlock(TEST_USER, p.id, { title: 'Pecs', weekdays: [0] });
		const custom = await createExercise(TEST_USER, { name: 'Incline Press', muscleGroup: 'chest' });

		await createEntry(TEST_USER, block!.id, {
			kind: 'exercise',
			exerciseId: custom!.id,
			sets: 4,
			reps: '6-8',
			weight: 50,
			notes: 'Pause on chest'
		});
		await createEntry(TEST_USER, block!.id, { kind: 'title', title: 'Triceps' });

		const view = await getProgram(TEST_USER, p.id);
		expect(view!.blocks.length).toBe(1);
		expect(view!.blocks[0].weekdays).toEqual([0]);
		expect(view!.blocks[0].entries.length).toBe(2);
		const entry = view!.blocks[0].entries[0];
		expect(entry.kind).toBe('exercise');
		expect(entry.exercise?.name).toBe('Incline Press');
		expect(entry.sets).toBe(4);
		expect(entry.reps).toBe('6-8');
		expect(entry.weight).toBe(50);
		expect(entry.notes).toBe('Pause on chest');
		expect(view!.blocks[0].entries[1].kind).toBe('title');
		expect(view!.blocks[0].entries[1].title).toBe('Triceps');
	});

	it('rejects entries pointing at another user exercise', async () => {
		const p = await createProgram(TEST_USER, { name: 'P' });
		const block = await createBlock(TEST_USER, p.id, { title: 'B' });
		const foreign = await createExercise(OTHER_USER, { name: 'Not yours', muscleGroup: 'chest' });

		const entry = await createEntry(TEST_USER, block!.id, {
			kind: 'exercise',
			exerciseId: foreign!.id
		});
		expect(entry).toBeNull();
	});

	it('projects blocks onto the calendar on their weekdays', async () => {
		const p = await createProgram(TEST_USER, { name: 'Split' });
		await createBlock(TEST_USER, p.id, { title: 'Pecs', weekdays: [0, 4] });

		// 2026-11-09 is a Monday; the range covers Mon–Sun.
		const start = new Date(2026, 10, 9);
		const end = new Date(2026, 10, 15, 23, 59, 59);
		const occurrences = await getProgramOccurrences(TEST_USER, start, end);

		expect(occurrences.length).toBe(2);
		expect(occurrences[0].title).toBe('Pecs');
		expect(occurrences[0].programName).toBe('Split');
		const days = occurrences.map((o) => o.date.getDate());
		expect(days).toEqual([9, 13]); // Monday and Friday

		// Inactive programs leave the calendar.
		await updateProgram(TEST_USER, p.id, { active: false });
		expect((await getProgramOccurrences(TEST_USER, start, end)).length).toBe(0);
	});

	it('shapes a block for the new-session form', async () => {
		const p = await createProgram(TEST_USER, { name: 'Legs' });
		const block = await createBlock(TEST_USER, p.id, { title: 'Quads' });
		const custom = await createExercise(TEST_USER, { name: 'Squat', muscleGroup: 'quadriceps' });
		await createEntry(TEST_USER, block!.id, {
			kind: 'exercise',
			exerciseId: custom!.id,
			sets: 5,
			reps: '5',
			weight: 100
		});
		await createEntry(TEST_USER, block!.id, { kind: 'title', title: 'Notes' });

		const shaped = await getProgramBlockForSession(TEST_USER, block!.id);
		expect(shaped!.title).toBe('Quads');
		expect(shaped!.programName).toBe('Legs');
		expect(shaped!.entries.length).toBe(1); // titles are not exercises
		expect(shaped!.entries[0].exerciseName).toBe('Squat');
		expect(shaped!.entries[0].weight).toBe(100);

		// Other users get nothing.
		expect(await getProgramBlockForSession(OTHER_USER, block!.id)).toBeNull();
	});

	it('updates and deletes blocks and entries', async () => {
		const p = await createProgram(TEST_USER, { name: 'P' });
		const block = await createBlock(TEST_USER, p.id, { title: 'Old', weekdays: [0] });
		const updated = await updateBlock(TEST_USER, block!.id, {
			title: 'New',
			weekdays: [2, 3],
			position: 5
		});
		expect(updated!.title).toBe('New');
		expect(JSON.parse(updated!.weekdays)).toEqual([2, 3]);

		const entry = await createEntry(TEST_USER, block!.id, { kind: 'title', title: 'Section' });
		const cleared = await updateEntry(TEST_USER, entry!.id, { title: null, notes: null });
		expect(cleared!.title).toBeNull();

		expect(await deleteEntry(OTHER_USER, entry!.id)).toBe(false);
		expect(await deleteEntry(TEST_USER, entry!.id)).toBe(true);
		expect(await deleteBlock(OTHER_USER, block!.id)).toBe(false);
		expect(await deleteBlock(TEST_USER, block!.id)).toBe(true);
		expect(await deleteProgram(TEST_USER, p.id)).toBe(true);
	});

	it('deletes program rows through the user scope only', async () => {
		const p = await createProgram(TEST_USER, { name: 'Keep' });
		expect(await deleteProgram(OTHER_USER, p.id)).toBe(false);
		expect((await getPrograms(TEST_USER)).length).toBe(1);
	});
});
