import { db, type DbExecutor } from '$lib/server/db';
import {
	exercise,
	trainingExerciseRecord,
	trainingActivity,
	trainingSession
} from '$lib/server/db/schema';
import { saveAttachmentFile, getAttachmentFilePath } from '$lib/server/services/attachment.service';
import { BUILTIN_EXERCISES } from '$lib/server/exercises/catalog';
import { eq, and, or, inArray, like, isNull, isNotNull } from 'drizzle-orm';
import { unlink } from 'fs/promises';

export const MUSCLE_GROUPS = [
	'chest',
	'back',
	'shoulders',
	'biceps',
	'triceps',
	'forearms',
	'abs',
	'glutes',
	'quadriceps',
	'hamstrings',
	'calves',
	'full_body',
	'cardio',
	'other'
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const MAX_EXERCISE_IMAGES = 4;

/** A stored upload referenced by exercise.imageFiles. */
export interface StoredImage {
	storedName: string;
	mimeType: string;
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}

function normalizeMuscleGroup(value: string): MuscleGroup {
	return (MUSCLE_GROUPS as readonly string[]).includes(value) ? (value as MuscleGroup) : 'other';
}

/** Client-facing exercise shape: images merged into one ordered list. */
export interface ExerciseView {
	id: string;
	name: string;
	muscleGroup: MuscleGroup;
	secondaryMuscles: string[];
	equipment: string | null;
	description: string | null;
	images: string[];
	isBuiltIn: boolean;
}

export function toExerciseView(row: typeof exercise.$inferSelect): ExerciseView {
	const files = parseJsonArray<StoredImage>(row.imageFiles);
	const fileUrls = files.map(
		(f) =>
			`/api/exercises/image?id=${encodeURIComponent(row.id)}&name=${encodeURIComponent(f.storedName)}`
	);
	return {
		id: row.id,
		name: row.name,
		muscleGroup: normalizeMuscleGroup(row.muscleGroup),
		secondaryMuscles: parseJsonArray<string>(row.secondaryMuscles),
		equipment: row.equipment,
		description: row.description,
		images: [...fileUrls, ...parseJsonArray<string>(row.imageUrls)],
		isBuiltIn: row.userId === null
	};
}

/**
 * Insert the bundled catalog rows (shared, userId = null) if missing. The
 * existence probe makes this idempotent and self-healing after wipes.
 */
export async function ensureBuiltInExercises(executor: DbExecutor = db) {
	const existing = await executor
		.select({ id: exercise.id })
		.from(exercise)
		.where(isNotNull(exercise.builtinKey))
		.limit(1)
		.all();
	if (existing.length > 0) return;
	const rows = BUILTIN_EXERCISES.map((e) => ({
		userId: null,
		name: e.name,
		muscleGroup: normalizeMuscleGroup(e.muscleGroup),
		secondaryMuscles: JSON.stringify(e.secondaryMuscles),
		equipment: e.equipment || null,
		description: e.description || null,
		imageUrls: JSON.stringify(e.imageUrls),
		builtinKey: e.key
	}));
	await executor.insert(exercise).values(rows).onConflictDoNothing({ target: exercise.builtinKey });
}

export async function listExercises(
	userId: string,
	opts: { search?: string; muscleGroup?: string } = {}
): Promise<ExerciseView[]> {
	await ensureBuiltInExercises();
	const conditions = [or(isNull(exercise.userId), eq(exercise.userId, userId))];
	if (opts.muscleGroup) {
		conditions.push(eq(exercise.muscleGroup, normalizeMuscleGroup(opts.muscleGroup)));
	}
	if (opts.search?.trim()) {
		conditions.push(like(exercise.name, `%${opts.search.trim()}%`));
	}
	const rows = await db
		.select()
		.from(exercise)
		.where(and(...conditions))
		.orderBy(exercise.name)
		.all();
	return rows.map(toExerciseView);
}

async function findExercise(userId: string, exerciseId: string) {
	const row = await db.select().from(exercise).where(eq(exercise.id, exerciseId)).get();
	if (!row) return null;
	if (row.userId !== null && row.userId !== userId) return null;
	return row;
}

export async function getExercise(
	userId: string,
	exerciseId: string
): Promise<ExerciseView | null> {
	const row = await findExercise(userId, exerciseId);
	return row ? toExerciseView(row) : null;
}

export async function getExercisesByIds(
	userId: string,
	exerciseIds: string[]
): Promise<ExerciseView[]> {
	if (exerciseIds.length === 0) return [];
	const rows = await db
		.select()
		.from(exercise)
		.where(
			and(
				inArray(exercise.id, exerciseIds),
				or(isNull(exercise.userId), eq(exercise.userId, userId))
			)
		)
		.all();
	return rows.map(toExerciseView);
}

export async function createExercise(
	userId: string,
	data: {
		name: string;
		muscleGroup?: string;
		secondaryMuscles?: string[];
		equipment?: string;
		description?: string;
		imageUrls?: string[];
	}
) {
	const [row] = await db
		.insert(exercise)
		.values({
			userId,
			name: data.name.trim(),
			muscleGroup: normalizeMuscleGroup(data.muscleGroup ?? 'other'),
			secondaryMuscles: data.secondaryMuscles ? JSON.stringify(data.secondaryMuscles) : null,
			equipment: data.equipment?.trim() || null,
			description: data.description?.trim() || null,
			imageUrls: data.imageUrls && data.imageUrls.length > 0 ? JSON.stringify(data.imageUrls) : null
		})
		.returning();
	return row ? toExerciseView(row) : null;
}

export async function updateExercise(
	userId: string,
	exerciseId: string,
	data: {
		name?: string;
		muscleGroup?: string;
		secondaryMuscles?: string[];
		equipment?: string;
		description?: string;
		imageUrls?: string[];
	}
) {
	const existing = await findExercise(userId, exerciseId);
	// Built-in rows are shared; only user rows are editable.
	if (!existing || existing.userId === null) return null;

	const update: Record<string, unknown> = {};
	if (data.name !== undefined) update.name = data.name.trim();
	if (data.muscleGroup !== undefined) update.muscleGroup = normalizeMuscleGroup(data.muscleGroup);
	if (data.secondaryMuscles !== undefined)
		update.secondaryMuscles = JSON.stringify(data.secondaryMuscles);
	if (data.equipment !== undefined) update.equipment = data.equipment.trim() || null;
	if (data.description !== undefined) update.description = data.description.trim() || null;
	if (data.imageUrls !== undefined)
		update.imageUrls = data.imageUrls.length > 0 ? JSON.stringify(data.imageUrls) : null;

	const [row] = await db
		.update(exercise)
		.set(update)
		.where(eq(exercise.id, exerciseId))
		.returning();
	return row ? toExerciseView(row) : null;
}

export async function deleteExercise(userId: string, exerciseId: string): Promise<boolean> {
	const existing = await findExercise(userId, exerciseId);
	if (!existing || existing.userId === null) return false;

	// Clean up uploaded files (program entries cascade via FK).
	for (const f of parseJsonArray<StoredImage>(existing.imageFiles)) {
		const filePath = await getAttachmentFilePath(userId, f.storedName);
		if (filePath) await unlink(filePath).catch(() => {});
	}
	await db.delete(exercise).where(eq(exercise.id, exerciseId));
	return true;
}

export async function saveExerciseImage(
	userId: string,
	exerciseId: string,
	file: File
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
	const existing = await findExercise(userId, exerciseId);
	if (!existing || existing.userId === null) return { ok: false, error: 'Exercise not found' };

	const files = parseJsonArray<StoredImage>(existing.imageFiles);
	if (files.length >= MAX_EXERCISE_IMAGES) {
		return { ok: false, error: `At most ${MAX_EXERCISE_IMAGES} uploaded images per exercise` };
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await saveAttachmentFile(userId, file.name, file.type, buffer);
	if (!result.ok) return { ok: false, error: result.error };
	if (!result.mimeType.startsWith('image/')) return { ok: false, error: 'File must be an image' };

	files.push({ storedName: result.storedName, mimeType: result.mimeType });
	await db
		.update(exercise)
		.set({ imageFiles: JSON.stringify(files) })
		.where(eq(exercise.id, exerciseId));

	const view = await getExercise(userId, exerciseId);
	return { ok: true, images: view?.images ?? [] };
}

export async function deleteExerciseImage(
	userId: string,
	exerciseId: string,
	storedName: string
): Promise<boolean> {
	const existing = await findExercise(userId, exerciseId);
	if (!existing || existing.userId === null) return false;

	const files = parseJsonArray<StoredImage>(existing.imageFiles);
	const kept = files.filter((f) => f.storedName !== storedName);
	if (kept.length === files.length) return false;

	const filePath = await getAttachmentFilePath(userId, storedName);
	if (filePath) await unlink(filePath).catch(() => {});
	await db
		.update(exercise)
		.set({ imageFiles: JSON.stringify(kept) })
		.where(eq(exercise.id, exerciseId));
	return true;
}

export async function getExerciseImageFile(
	userId: string,
	exerciseId: string,
	storedName: string
): Promise<{ path: string; mimeType: string } | null> {
	const existing = await findExercise(userId, exerciseId);
	if (!existing) return null;
	const file = parseJsonArray<StoredImage>(existing.imageFiles).find(
		(f) => f.storedName === storedName
	);
	if (!file) return null;
	const filePath = await getAttachmentFilePath(userId, file.storedName);
	if (!filePath) return null;
	return { path: filePath, mimeType: file.mimeType };
}

// ─── Personal records ────────────────────────────────────────────────────────
export interface PersonalRecord {
	/** Best logged weight (kg) across all sessions. */
	maxWeight: number | null;
	/** Best logged reps (upper bound of ranges like "6-8"). */
	maxReps: number | null;
	/** Unit of the heaviest set. */
	unit: string | null;
}

function parseReps(reps: string | null): number | null {
	if (!reps) return null;
	const numbers = reps.match(/\d+/g);
	if (!numbers) return null;
	return Math.max(...numbers.map(Number));
}

/**
 * Personal records per exercise, computed from logged training records.
 * "7 reps for 50 kg" = maxReps at maxWeight; bodyweight work falls back to
 * max reps alone.
 */
export async function getPersonalRecords(
	userId: string,
	exerciseIds: string[]
): Promise<Map<string, PersonalRecord>> {
	const prs = new Map<string, PersonalRecord>();
	if (exerciseIds.length === 0) return prs;

	const rows = await db
		.select({
			exerciseId: trainingExerciseRecord.exerciseId,
			reps: trainingExerciseRecord.reps,
			weight: trainingExerciseRecord.weight,
			unit: trainingExerciseRecord.unit
		})
		.from(trainingExerciseRecord)
		.innerJoin(trainingActivity, eq(trainingExerciseRecord.activityId, trainingActivity.id))
		.innerJoin(trainingSession, eq(trainingActivity.sessionId, trainingSession.id))
		.where(
			and(
				eq(trainingSession.userId, userId),
				inArray(trainingExerciseRecord.exerciseId, exerciseIds)
			)
		)
		.all();

	for (const row of rows) {
		if (!row.exerciseId) continue;
		const current = prs.get(row.exerciseId) ?? {
			maxWeight: null,
			maxReps: null,
			unit: null
		};
		const reps = parseReps(row.reps);
		const weight = row.weight ?? null;

		if (weight !== null && (current.maxWeight === null || weight > current.maxWeight)) {
			current.maxWeight = weight;
			current.unit = row.unit;
			// New heaviest weight: reps at this weight restart the count.
			current.maxReps = reps;
		} else if (weight === null && current.maxWeight === null) {
			// Bodyweight-only history: keep the best rep count.
			current.maxReps = Math.max(current.maxReps ?? 0, reps ?? 0) || null;
		} else if (weight !== null && weight === current.maxWeight && reps !== null) {
			current.maxReps = Math.max(current.maxReps ?? 0, reps);
		}
		prs.set(row.exerciseId, current);
	}

	return prs;
}
