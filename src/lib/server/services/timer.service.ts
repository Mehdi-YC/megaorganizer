import { db } from '$lib/server/db';
import { timerTemplate, timerStep } from '$lib/server/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

export type TimerStepKind = 'start' | 'normal' | 'info' | 'silent' | 'end' | 'group';

export interface TimerStepInput {
	kind: TimerStepKind;
	label: string;
	durationSec?: number | null;
	groupRounds?: number | null;
	children?: TimerStepInput[];
}

export interface TimerTemplateInput {
	name: string;
	description?: string;
	rounds?: number;
	steps?: TimerStepInput[];
}

function flattenSteps(
	steps: TimerStepInput[],
	parentIndex: string | null,
	out: Array<{
		kind: TimerStepKind;
		label: string;
		durationSec: number | null;
		groupRounds: number | null;
		parentIndex: string | null;
		position: number;
	}>
) {
	steps.forEach((step, i) => {
		const selfIndex = `${parentIndex ?? ''}/${i}`;
		out.push({
			kind: step.kind,
			label: step.label,
			durationSec: step.durationSec ?? null,
			groupRounds: step.groupRounds ?? null,
			parentIndex,
			position: i
		});
		if (step.children && step.children.length > 0) {
			flattenSteps(step.children, selfIndex, out);
		}
	});
}

export async function createTimerTemplate(userId: string, data: TimerTemplateInput) {
	const [template] = await db
		.insert(timerTemplate)
		.values({
			userId,
			name: data.name,
			description: data.description,
			rounds: data.rounds ?? 1
		})
		.returning();

	if (data.steps && data.steps.length > 0) {
		await insertSteps(template.id, data.steps);
	}

	return getTimerTemplateById(userId, template.id);
}

async function insertSteps(templateId: string, steps: TimerStepInput[]) {
	const flat: Array<{
		kind: TimerStepKind;
		label: string;
		durationSec: number | null;
		groupRounds: number | null;
		parentIndex: string | null;
		position: number;
	}> = [];
	flattenSteps(steps, null, flat);

	// Insert in order so parents exist before children reference them.
	const idByIndex = new Map<string, string>();
	for (const row of flat) {
		const parentId = row.parentIndex ? (idByIndex.get(row.parentIndex) ?? null) : null;
		const [inserted] = await db
			.insert(timerStep)
			.values({
				timerTemplateId: templateId,
				parentId,
				kind: row.kind,
				label: row.label,
				durationSec: row.durationSec,
				groupRounds: row.groupRounds,
				position: row.position
			})
			.returning({ id: timerStep.id });
		idByIndex.set(`${row.parentIndex ?? ''}/${row.position}`, inserted.id);
	}
}

export async function getTimerTemplates(userId: string) {
	const templates = await db
		.select()
		.from(timerTemplate)
		.where(eq(timerTemplate.userId, userId))
		.orderBy(asc(timerTemplate.createdAt))
		.all();

	if (templates.length === 0) return [];

	const allSteps = await db
		.select()
		.from(timerStep)
		.where(
			inArray(
				timerStep.timerTemplateId,
				templates.map((t) => t.id)
			)
		)
		.orderBy(asc(timerStep.position))
		.all();

	return templates.map((t) => ({
		...t,
		steps: nestSteps(allSteps.filter((s) => s.timerTemplateId === t.id))
	}));
}

export function nestSteps(steps: Array<typeof timerStep.$inferSelect>) {
	const byParent = new Map<string | null, typeof steps>();
	for (const step of steps) {
		const key = step.parentId ?? null;
		const arr = byParent.get(key) ?? [];
		arr.push(step);
		byParent.set(key, arr);
	}
	const build = (parent: string | null): Array<(typeof steps)[number] & { children?: unknown[] }> =>
		(byParent.get(parent) ?? []).map((step) => {
			const children = build(step.id);
			return children.length > 0 ? { ...step, children } : step;
		});
	return build(null);
}

export async function getTimerTemplateById(userId: string, templateId: string) {
	const template = await db
		.select()
		.from(timerTemplate)
		.where(and(eq(timerTemplate.userId, userId), eq(timerTemplate.id, templateId)))
		.get();

	if (!template) return null;

	const steps = await db
		.select()
		.from(timerStep)
		.where(eq(timerStep.timerTemplateId, templateId))
		.orderBy(asc(timerStep.position))
		.all();

	return { ...template, steps: nestSteps(steps) };
}

export async function updateTimerTemplate(
	userId: string,
	templateId: string,
	data: Partial<TimerTemplateInput>
) {
	const existing = await db
		.select({ id: timerTemplate.id })
		.from(timerTemplate)
		.where(and(eq(timerTemplate.userId, userId), eq(timerTemplate.id, templateId)))
		.get();
	if (!existing) return null;

	const [updated] = await db
		.update(timerTemplate)
		.set({
			...(data.name !== undefined ? { name: data.name } : {}),
			...(data.description !== undefined ? { description: data.description } : {}),
			...(data.rounds !== undefined ? { rounds: data.rounds } : {})
		})
		.where(eq(timerTemplate.id, templateId))
		.returning();
	if (!updated) return null;

	// Steps are replaced wholesale when provided.
	if (data.steps) {
		await db.delete(timerStep).where(eq(timerStep.timerTemplateId, templateId));
		if (data.steps.length > 0) await insertSteps(templateId, data.steps);
	}

	return getTimerTemplateById(userId, templateId);
}

export async function deleteTimerTemplate(userId: string, templateId: string) {
	const existing = await db
		.select({ id: timerTemplate.id })
		.from(timerTemplate)
		.where(and(eq(timerTemplate.userId, userId), eq(timerTemplate.id, templateId)))
		.get();
	if (!existing) return false;

	await db.delete(timerTemplate).where(eq(timerTemplate.id, templateId));
	return true;
}

export async function duplicateTimerTemplate(userId: string, templateId: string) {
	const source = await getTimerTemplateById(userId, templateId);
	if (!source) return null;

	return createTimerTemplate(userId, {
		name: `${source.name} (copy)`,
		description: source.description ?? undefined,
		rounds: source.rounds,
		steps: unflattenStoredSteps(source.steps as unknown[])
	});
}

// Stored nested rows carry extra DB fields; map back to the input shape.
function unflattenStoredSteps(steps: unknown[]): TimerStepInput[] {
	return (steps as Array<Record<string, unknown>>).map((step) => {
		const children = (step.children ?? []) as unknown[];
		return {
			kind: step.kind as TimerStepKind,
			label: String(step.label),
			durationSec: (step.durationSec as number | null) ?? null,
			groupRounds: (step.groupRounds as number | null) ?? null,
			...(children.length > 0 ? { children: unflattenStoredSteps(children) } : {})
		};
	});
}
