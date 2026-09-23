import { db } from '$lib/server/db';
import { wikilink, page, treeElement } from '$lib/server/db/schema';
import { eq, and, inArray, sql, isNull, isNotNull, desc } from 'drizzle-orm';
import { findWikilinks } from '$lib/utils/wikilink';

export type LinkSourceType = 'page' | 'tree_element';
export type LinkTargetType = 'page' | 'tree_element';

export interface LinkMap {
	/** Target name -> in-app href, or null when nothing matches yet. */
	[target: string]: string | null;
}

export interface Backlink {
	sourceType: LinkSourceType;
	sourceId: string;
	title: string;
	href: string;
}

function pageHref(categoryId: string, id: string): string {
	return `/app/category/${categoryId}/page/${id}`;
}

function elementHref(id: string): string {
	return `/app/item/${id}`;
}

interface Candidate {
	type: LinkTargetType;
	id: string;
	name: string;
	categoryId: string | null;
	createdAt: Date;
}

/** Find the best entity for a set of target names (case-insensitive). */
async function resolveTargets(userId: string, targets: string[]): Promise<Map<string, Candidate>> {
	const resolved = new Map<string, Candidate>();
	if (targets.length === 0) return resolved;

	const lowerList = targets.map((t) => t.toLowerCase());
	const inTargets = sql.join(
		lowerList.map((t) => sql`${t}`),
		sql`, `
	);

	const [pages, elements] = await Promise.all([
		db
			.select({
				id: page.id,
				name: page.name,
				categoryId: page.categoryId,
				createdAt: page.createdAt
			})
			.from(page)
			.where(and(eq(page.userId, userId), sql`lower(${page.name}) IN (${inTargets})`))
			.all(),
		db
			.select({
				id: treeElement.id,
				name: treeElement.name,
				createdAt: treeElement.createdAt
			})
			.from(treeElement)
			.where(and(eq(treeElement.userId, userId), sql`lower(${treeElement.name}) IN (${inTargets})`))
			.all()
	]);

	const candidates = new Map<string, Candidate[]>();
	const push = (targetKey: string, cand: Candidate) => {
		const list = candidates.get(targetKey) ?? [];
		list.push(cand);
		candidates.set(targetKey, list);
	};
	for (const p of pages) {
		push(p.name.toLowerCase(), {
			type: 'page',
			id: p.id,
			name: p.name,
			categoryId: p.categoryId,
			createdAt: p.createdAt
		});
	}
	for (const el of elements) {
		push(el.name.toLowerCase(), {
			type: 'tree_element',
			id: el.id,
			name: el.name,
			categoryId: null,
			createdAt: el.createdAt
		});
	}

	for (const target of targets) {
		const list = candidates.get(target.toLowerCase());
		if (!list || list.length === 0) continue;
		// Deterministic choice: exact case match first, then oldest entity.
		const pick =
			list.find((c) => c.name === target) ??
			[...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
		resolved.set(target, pick);
	}
	return resolved;
}

function hrefOf(cand: Candidate): string {
	return cand.type === 'page' ? pageHref(cand.categoryId ?? '', cand.id) : elementHref(cand.id);
}

/** Single-target resolution for click-to-resolve spans. */
export async function resolveTargetByName(userId: string, target: string): Promise<string | null> {
	const resolved = await resolveTargets(userId, [target]);
	const cand = resolved.get(target);
	if (cand) return hrefOf(cand);

	// Renamed target fallback: previous edges remember where this name led,
	// so stale links do not offer to create a duplicate.
	const prev = await db
		.select({ resolvedType: wikilink.resolvedType, resolvedId: wikilink.resolvedId })
		.from(wikilink)
		.where(
			and(
				eq(wikilink.userId, userId),
				isNotNull(wikilink.resolvedId),
				sql`lower(${wikilink.rawTarget}) = ${target.toLowerCase()}`
			)
		)
		.orderBy(desc(wikilink.createdAt))
		.limit(1)
		.get();
	if (!prev?.resolvedId || !prev.resolvedType) return null;
	return prev.resolvedType === 'page'
		? pageHrefFor(userId, prev.resolvedId)
		: elementExists(userId, prev.resolvedId);
}

async function elementExists(userId: string, id: string): Promise<string | null> {
	const row = await db
		.select({ id: treeElement.id })
		.from(treeElement)
		.where(and(eq(treeElement.id, id), eq(treeElement.userId, userId)))
		.get();
	return row ? elementHref(id) : null;
}

/**
 * Resolve every wikilink in a document for rendering. Name matches win;
 * when a name lookup fails (the target was renamed) the source's previous
 * edge keeps the link alive via resolvedId.
 */
export async function resolveDocLinks(
	userId: string,
	sourceType: LinkSourceType,
	sourceId: string,
	markdown: string | null | undefined
): Promise<LinkMap> {
	const refs = findWikilinks(markdown);
	if (refs.length === 0) return {};

	const resolved = await resolveTargets(
		userId,
		refs.map((r) => r.target)
	);
	const links: LinkMap = {};
	const unresolved: string[] = [];
	for (const ref of refs) {
		const cand = resolved.get(ref.target);
		if (cand) {
			links[ref.target] = hrefOf(cand);
		} else {
			links[ref.target] = null;
			unresolved.push(ref.target);
		}
	}

	// Rename fallback: keep links alive through the previous resolution.
	if (unresolved.length > 0) {
		const previous = await db
			.select({
				rawTarget: wikilink.rawTarget,
				resolvedType: wikilink.resolvedType,
				resolvedId: wikilink.resolvedId
			})
			.from(wikilink)
			.where(
				and(
					eq(wikilink.userId, userId),
					eq(wikilink.sourceType, sourceType),
					eq(wikilink.sourceId, sourceId),
					inArray(wikilink.rawTarget, unresolved)
				)
			)
			.all();
		for (const prev of previous) {
			if (!prev.resolvedId || !prev.resolvedType) continue;
			links[prev.rawTarget] =
				prev.resolvedType === 'page'
					? await pageHrefFor(userId, prev.resolvedId)
					: elementHref(prev.resolvedId);
		}
	}
	return links;
}

async function pageHrefFor(userId: string, pageId: string): Promise<string | null> {
	const row = await db
		.select({ categoryId: page.categoryId })
		.from(page)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)))
		.get();
	return row ? pageHref(row.categoryId, pageId) : null;
}

/**
 * Rebuild the edge rows of one document. Runs in a single transaction and
 * carries previous resolutions forward when a name no longer resolves, so
 * renaming a target never breaks the stored link.
 */
export async function rebuildDocLinks(
	userId: string,
	sourceType: LinkSourceType,
	sourceId: string,
	markdown: string | null | undefined
): Promise<void> {
	const refs = findWikilinks(markdown);

	await db.transaction(async (tx) => {
		const previousRows = await tx
			.select({
				rawTarget: wikilink.rawTarget,
				resolvedType: wikilink.resolvedType,
				resolvedId: wikilink.resolvedId
			})
			.from(wikilink)
			.where(
				and(
					eq(wikilink.userId, userId),
					eq(wikilink.sourceType, sourceType),
					eq(wikilink.sourceId, sourceId)
				)
			)
			.all();
		const previous = new Map(previousRows.map((r) => [r.rawTarget, r]));

		await tx
			.delete(wikilink)
			.where(
				and(
					eq(wikilink.userId, userId),
					eq(wikilink.sourceType, sourceType),
					eq(wikilink.sourceId, sourceId)
				)
			);
		if (refs.length === 0) return;

		const resolved = await resolveTargets(
			userId,
			refs.map((r) => r.target)
		);

		// Which carried targets still exist?
		const carriedIds = [...previous.values()]
			.filter((p) => p.resolvedId && !resolved.has(p.rawTarget))
			.map((p) => p.resolvedId as string);
		const alive = new Set<string>();
		if (carriedIds.length > 0) {
			const [alivePages, aliveElements] = await Promise.all([
				tx.select({ id: page.id }).from(page).where(inArray(page.id, carriedIds)).all(),
				tx
					.select({ id: treeElement.id })
					.from(treeElement)
					.where(inArray(treeElement.id, carriedIds))
					.all()
			]);
			for (const p of alivePages) alive.add(p.id);
			for (const e of aliveElements) alive.add(e.id);
		}

		for (const ref of refs) {
			const cand = resolved.get(ref.target);
			const prev = previous.get(ref.target);
			const carry =
				!cand && prev?.resolvedId && alive.has(prev.resolvedId)
					? { resolvedType: prev.resolvedType, resolvedId: prev.resolvedId }
					: { resolvedType: null, resolvedId: null };
			await tx.insert(wikilink).values({
				userId,
				sourceType,
				sourceId,
				rawTarget: ref.target,
				resolvedType: cand ? cand.type : carry.resolvedType,
				resolvedId: cand ? cand.id : carry.resolvedId
			});
		}
	});
}

/** Rebuild every document's links for one user (used after backup import). */
export async function rebuildAllDocLinks(userId: string): Promise<void> {
	const pages = await db
		.select({ id: page.id, markdown: page.markdown })
		.from(page)
		.where(eq(page.userId, userId))
		.all();
	const elements = await db
		.select({ id: treeElement.id, markdown: treeElement.markdown })
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();
	for (const p of pages) {
		await rebuildDocLinks(userId, 'page', p.id, p.markdown);
	}
	for (const el of elements) {
		await rebuildDocLinks(userId, 'tree_element', el.id, el.markdown);
	}
}

/**
 * Bind dangling links whose target name matches a (re)named entity. Called
 * whenever an entity is created or renamed, so links to "My Page" light up
 * as soon as something called "My Page" exists.
 */
export async function rebindDanglingLinks(
	userId: string,
	name: string,
	targetType: LinkTargetType,
	targetId: string
): Promise<void> {
	await db
		.update(wikilink)
		.set({ resolvedType: targetType, resolvedId: targetId })
		.where(
			and(
				eq(wikilink.userId, userId),
				isNull(wikilink.resolvedId),
				sql`lower(${wikilink.rawTarget}) = ${name.toLowerCase()}`
			)
		);
}

/** Point inbound links at nothing when their target is deleted. */
export async function unlinkDeletedTarget(
	targetType: LinkTargetType,
	targetId: string
): Promise<void> {
	await db
		.update(wikilink)
		.set({ resolvedType: null, resolvedId: null })
		.where(and(eq(wikilink.resolvedType, targetType), eq(wikilink.resolvedId, targetId)));
}

/** Remove the edges owned by a deleted document. */
export async function deleteSourceLinks(
	userId: string,
	sourceType: LinkSourceType,
	sourceId: string
): Promise<void> {
	await db
		.delete(wikilink)
		.where(
			and(
				eq(wikilink.userId, userId),
				eq(wikilink.sourceType, sourceType),
				eq(wikilink.sourceId, sourceId)
			)
		);
}

/** Documents whose markdown links to the given entity. */
export async function getBacklinks(
	userId: string,
	targetType: LinkTargetType,
	targetId: string
): Promise<Backlink[]> {
	const rows = await db
		.select({
			sourceType: wikilink.sourceType,
			sourceId: wikilink.sourceId
		})
		.from(wikilink)
		.where(
			and(
				eq(wikilink.userId, userId),
				eq(wikilink.resolvedType, targetType),
				eq(wikilink.resolvedId, targetId)
			)
		)
		.all();

	const backlinks: Backlink[] = [];
	const pageIds = rows.filter((r) => r.sourceType === 'page').map((r) => r.sourceId);
	const elementIds = rows.filter((r) => r.sourceType === 'tree_element').map((r) => r.sourceId);

	if (pageIds.length > 0) {
		const sources = await db
			.select({ id: page.id, name: page.name, categoryId: page.categoryId })
			.from(page)
			.where(and(eq(page.userId, userId), inArray(page.id, pageIds)))
			.all();
		for (const s of sources) {
			backlinks.push({
				sourceType: 'page',
				sourceId: s.id,
				title: s.name,
				href: pageHref(s.categoryId, s.id)
			});
		}
	}
	if (elementIds.length > 0) {
		const sources = await db
			.select({ id: treeElement.id, name: treeElement.name })
			.from(treeElement)
			.where(and(eq(treeElement.userId, userId), inArray(treeElement.id, elementIds)))
			.all();
		for (const s of sources) {
			backlinks.push({
				sourceType: 'tree_element',
				sourceId: s.id,
				title: s.name,
				href: elementHref(s.id)
			});
		}
	}
	backlinks.sort((a, b) => a.title.localeCompare(b.title));
	return backlinks;
}
