import { db } from '$lib/server/db';
import { program, programBlock, programEntry, exercise } from '$lib/server/db/schema';
import {
	getPersonalRecords,
	getExercisesByIds,
	type PersonalRecord,
	type ExerciseView
} from '$lib/server/services/exercise.service';
import { eq, and, inArray, asc, ne, count } from 'drizzle-orm';

/** 0 = Monday … 6 = Sunday (matches the calendar's Monday-first grid). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function parseWeekdays(value: string | null | undefined): Weekday[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) as Weekday[];
	} catch {
		return [];
	}
}

/** Calendar rows are dates at local midnight. */
export function weekdayOf(date: Date): Weekday {
	return ((date.getDay() + 6) % 7) as Weekday;
}

export interface ProgramEntryView {
	id: string;
	blockId: string;
	kind: 'title' | 'exercise';
	title: string | null;
	exerciseId: string | null;
	sets: number | null;
	reps: string | null;
	weight: number | null;
	unit: string | null;
	notes: string | null;
	position: number;
	exercise: ExerciseView | null;
	/** Logged PR for the linked exercise: "7 reps for 50 kg". */
	pr: PersonalRecord | null;
}

export interface ProgramBlockView {
	id: string;
	programId: string;
	title: string;
	weekdays: Weekday[];
	position: number;
	entries: ProgramEntryView[];
}

export interface ProgramView {
	id: string;
	name: string;
	description: string | null;
	active: boolean;
	blocks: ProgramBlockView[];
}

export interface ProgramListItem {
	id: string;
	name: string;
	description: string | null;
	active: boolean;
	blockCount: number;
	exerciseCount: number;
	weekdays: Weekday[];
}

// ─── Programs ────────────────────────────────────────────────────────────────
export async function createProgram(userId: string, data: { name: string; description?: string }) {
	const [row] = await db
		.insert(program)
		.values({
			userId,
			name: data.name.trim(),
			description: data.description?.trim() || null
		})
		.returning();
	return row ?? null;
}

export async function getPrograms(userId: string): Promise<ProgramListItem[]> {
	const rows = await db
		.select()
		.from(program)
		.where(eq(program.userId, userId))
		.orderBy(asc(program.name))
		.all();
	if (rows.length === 0) return [];

	const blocks = await db
		.select()
		.from(programBlock)
		.where(
			inArray(
				programBlock.programId,
				rows.map((r) => r.id)
			)
		)
		.all();

	const blockIds = blocks.map((b) => b.id);
	const entryCounts = new Map<string, number>();
	if (blockIds.length > 0) {
		const counts = await db
			.select({ blockId: programEntry.blockId, count: count() })
			.from(programEntry)
			.where(and(inArray(programEntry.blockId, blockIds), eq(programEntry.kind, 'exercise')))
			.groupBy(programEntry.blockId)
			.all();
		for (const c of counts) entryCounts.set(c.blockId, c.count);
	}

	return rows.map((r) => {
		const myBlocks = blocks.filter((b) => b.programId === r.id);
		const weekdays = new Set<Weekday>();
		for (const b of myBlocks) for (const w of parseWeekdays(b.weekdays)) weekdays.add(w);
		return {
			id: r.id,
			name: r.name,
			description: r.description,
			active: r.active,
			blockCount: myBlocks.length,
			exerciseCount: myBlocks.reduce((sum, b) => sum + (entryCounts.get(b.id) ?? 0), 0),
			weekdays: [...weekdays].sort()
		};
	});
}

export async function getProgram(userId: string, programId: string): Promise<ProgramView | null> {
	const row = await db
		.select()
		.from(program)
		.where(and(eq(program.id, programId), eq(program.userId, userId)))
		.get();
	if (!row) return null;

	const blocks = await db
		.select()
		.from(programBlock)
		.where(eq(programBlock.programId, programId))
		.orderBy(asc(programBlock.position))
		.all();

	const blockIds = blocks.map((b) => b.id);
	const entries =
		blockIds.length > 0
			? await db
					.select()
					.from(programEntry)
					.where(inArray(programEntry.blockId, blockIds))
					.orderBy(asc(programEntry.position))
					.all()
			: [];

	const exerciseIds = [
		...new Set(entries.map((e) => e.exerciseId).filter((id): id is string => !!id))
	];
	const [exerciseViews, prs] = await Promise.all([
		getExercisesByIds(userId, exerciseIds),
		getPersonalRecords(userId, exerciseIds)
	]);
	const exerciseById = new Map(exerciseViews.map((v) => [v.id, v]));

	return {
		id: row.id,
		name: row.name,
		description: row.description,
		active: row.active,
		blocks: blocks.map((b) => ({
			id: b.id,
			programId: b.programId,
			title: b.title,
			weekdays: parseWeekdays(b.weekdays),
			position: b.position,
			entries: entries
				.filter((e) => e.blockId === b.id)
				.map((e) => ({
					id: e.id,
					blockId: e.blockId,
					kind: e.kind,
					title: e.title,
					exerciseId: e.exerciseId,
					sets: e.sets,
					reps: e.reps,
					weight: e.weight,
					unit: e.unit,
					notes: e.notes,
					position: e.position,
					exercise: e.exerciseId ? (exerciseById.get(e.exerciseId) ?? null) : null,
					pr: e.exerciseId ? (prs.get(e.exerciseId) ?? null) : null
				}))
		}))
	};
}

export async function updateProgram(
	userId: string,
	programId: string,
	data: { name?: string; description?: string; active?: boolean }
) {
	const [row] = await db
		.update(program)
		.set({
			...(data.name !== undefined ? { name: data.name.trim() } : {}),
			...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
			...(data.active !== undefined ? { active: data.active } : {})
		})
		.where(and(eq(program.id, programId), eq(program.userId, userId)))
		.returning();
	return row ?? null;
}

export async function deleteProgram(userId: string, programId: string): Promise<boolean> {
	const result = await db
		.delete(program)
		.where(and(eq(program.id, programId), eq(program.userId, userId)))
		.returning({ id: program.id });
	return result.length > 0;
}

// ─── Blocks ──────────────────────────────────────────────────────────────────
async function findBlock(userId: string, blockId: string) {
	const row = await db
		.select({ block: programBlock, ownerId: program.userId })
		.from(programBlock)
		.innerJoin(program, eq(programBlock.programId, program.id))
		.where(eq(programBlock.id, blockId))
		.get();
	if (!row || row.ownerId !== userId) return null;
	return row.block;
}

export async function createBlock(
	userId: string,
	programId: string,
	data: { title: string; weekdays?: Weekday[] }
) {
	const owner = await db
		.select({ id: program.id })
		.from(program)
		.where(and(eq(program.id, programId), eq(program.userId, userId)))
		.get();
	if (!owner) return null;

	const existing = await db
		.select({ position: programBlock.position })
		.from(programBlock)
		.where(eq(programBlock.programId, programId))
		.all();
	const nextPosition = existing.reduce((max, b) => Math.max(max, b.position), -1) + 1;

	const [row] = await db
		.insert(programBlock)
		.values({
			programId,
			title: data.title.trim(),
			weekdays: JSON.stringify(data.weekdays ?? []),
			position: nextPosition
		})
		.returning();
	return row ?? null;
}

export async function updateBlock(
	userId: string,
	blockId: string,
	data: { title?: string; weekdays?: Weekday[]; position?: number }
) {
	const existing = await findBlock(userId, blockId);
	if (!existing) return null;

	const [row] = await db
		.update(programBlock)
		.set({
			...(data.title !== undefined ? { title: data.title.trim() } : {}),
			...(data.weekdays !== undefined ? { weekdays: JSON.stringify(data.weekdays) } : {}),
			...(data.position !== undefined ? { position: data.position } : {})
		})
		.where(eq(programBlock.id, blockId))
		.returning();
	return row ?? null;
}

export async function deleteBlock(userId: string, blockId: string): Promise<boolean> {
	const existing = await findBlock(userId, blockId);
	if (!existing) return false;
	await db.delete(programBlock).where(eq(programBlock.id, blockId));
	return true;
}

// ─── Entries ─────────────────────────────────────────────────────────────────
async function findEntry(userId: string, entryId: string) {
	const row = await db
		.select({ entry: programEntry, ownerId: program.userId })
		.from(programEntry)
		.innerJoin(programBlock, eq(programEntry.blockId, programBlock.id))
		.innerJoin(program, eq(programBlock.programId, program.id))
		.where(eq(programEntry.id, entryId))
		.get();
	if (!row || row.ownerId !== userId) return null;
	return row.entry;
}

export interface EntryInput {
	kind?: 'title' | 'exercise';
	title?: string | null;
	exerciseId?: string | null;
	sets?: number | null;
	reps?: string | null;
	weight?: number | null;
	unit?: string | null;
	notes?: string | null;
	position?: number;
}

async function verifyExerciseAccess(userId: string, exerciseId: string): Promise<boolean> {
	const row = await db
		.select({ id: exercise.id, ownerId: exercise.userId })
		.from(exercise)
		.where(eq(exercise.id, exerciseId))
		.get();
	return !!row && (row.ownerId === null || row.ownerId === userId);
}

export async function createEntry(userId: string, blockId: string, data: EntryInput) {
	const block = await findBlock(userId, blockId);
	if (!block) return null;
	if (data.exerciseId && !(await verifyExerciseAccess(userId, data.exerciseId))) return null;

	const existing = await db
		.select({ position: programEntry.position })
		.from(programEntry)
		.where(eq(programEntry.blockId, blockId))
		.all();
	const nextPosition =
		data.position ?? existing.reduce((max, e) => Math.max(max, e.position), -1) + 1;

	const [row] = await db
		.insert(programEntry)
		.values({
			blockId,
			kind: data.kind ?? 'exercise',
			title: data.title?.trim() || null,
			exerciseId: data.exerciseId ?? null,
			sets: data.sets ?? null,
			reps: data.reps ?? null,
			weight: data.weight ?? null,
			unit: data.unit ?? 'kg',
			notes: data.notes ?? null,
			position: nextPosition
		})
		.returning();
	return row ?? null;
}

export async function updateEntry(userId: string, entryId: string, data: EntryInput) {
	const existing = await findEntry(userId, entryId);
	if (!existing) return null;
	if (data.exerciseId && !(await verifyExerciseAccess(userId, data.exerciseId))) return null;

	const [row] = await db
		.update(programEntry)
		.set({
			...(data.kind !== undefined ? { kind: data.kind } : {}),
			...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
			...(data.exerciseId !== undefined ? { exerciseId: data.exerciseId } : {}),
			...(data.sets !== undefined ? { sets: data.sets } : {}),
			...(data.reps !== undefined ? { reps: data.reps } : {}),
			...(data.weight !== undefined ? { weight: data.weight } : {}),
			...(data.unit !== undefined ? { unit: data.unit } : {}),
			...(data.notes !== undefined ? { notes: data.notes } : {}),
			...(data.position !== undefined ? { position: data.position } : {})
		})
		.where(eq(programEntry.id, entryId))
		.returning();
	return row ?? null;
}

export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
	const existing = await findEntry(userId, entryId);
	if (!existing) return false;
	await db.delete(programEntry).where(eq(programEntry.id, entryId));
	return true;
}

// ─── Calendar ────────────────────────────────────────────────────────────────
export interface ProgramOccurrence {
	/** Stable per day: `${blockId}:${YYYY-MM-DD}`. */
	id: string;
	programId: string;
	blockId: string;
	programName: string;
	title: string;
	date: Date;
}

/**
 * Project active program blocks onto a date range (planned occurrences only —
 * nothing is materialized in the database).
 */
export async function getProgramOccurrences(
	userId: string,
	start: Date,
	end: Date
): Promise<ProgramOccurrence[]> {
	const rows = await db
		.select({
			blockId: programBlock.id,
			title: programBlock.title,
			weekdays: programBlock.weekdays,
			programId: program.id,
			programName: program.name
		})
		.from(programBlock)
		.innerJoin(program, eq(programBlock.programId, program.id))
		.where(
			and(eq(program.userId, userId), eq(program.active, true), ne(programBlock.weekdays, '[]'))
		)
		.all();

	const occurrences: ProgramOccurrence[] = [];
	if (rows.length === 0) return occurrences;

	// Guard against pathological ranges; the calendar asks for ~6 weeks.
	const days = Math.min(Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1, 400);
	for (let i = 0; i < days; i++) {
		const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
		if (date > end) break;
		const weekday = weekdayOf(date);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
		for (const row of rows) {
			if (!parseWeekdays(row.weekdays).includes(weekday)) continue;
			occurrences.push({
				id: `${row.blockId}:${dateStr}`,
				programId: row.programId,
				blockId: row.blockId,
				programName: row.programName,
				title: row.title,
				date
			});
		}
	}
	return occurrences;
}

// ─── Session prefill ─────────────────────────────────────────────────────────
export interface ProgramBlockForSession {
	id: string;
	title: string;
	programName: string;
	entries: Array<{
		exerciseId: string;
		exerciseName: string;
		image: string | null;
		sets: number | null;
		reps: string | null;
		weight: number | null;
		unit: string | null;
		notes: string | null;
	}>;
}

/**
 * Block contents shaped for the new-session form: "Start session" prefills
 * editable record rows so the user logs actual values (which feed PRs).
 */
export async function getProgramBlockForSession(
	userId: string,
	blockId: string
): Promise<ProgramBlockForSession | null> {
	const block = await findBlock(userId, blockId);
	if (!block) return null;

	const owner = await db
		.select({ name: program.name })
		.from(program)
		.where(eq(program.id, block.programId))
		.get();

	const entries = await db
		.select()
		.from(programEntry)
		.where(and(eq(programEntry.blockId, blockId), eq(programEntry.kind, 'exercise')))
		.orderBy(asc(programEntry.position))
		.all();

	const exerciseIds = entries.map((e) => e.exerciseId).filter((id): id is string => !!id);
	const views = await getExercisesByIds(userId, exerciseIds);
	const byId = new Map(views.map((v) => [v.id, v]));

	return {
		id: block.id,
		title: block.title,
		programName: owner?.name ?? '',
		entries: entries
			.filter((e) => e.exerciseId && byId.has(e.exerciseId))
			.map((e) => ({
				exerciseId: e.exerciseId as string,
				exerciseName: byId.get(e.exerciseId as string)?.name ?? 'Exercise',
				image: byId.get(e.exerciseId as string)?.images[0] ?? null,
				sets: e.sets,
				reps: e.reps,
				weight: e.weight,
				unit: e.unit,
				notes: e.notes
			}))
	};
}
