import { db } from '$lib/server/db';
import {
	category,
	page,
	treeElement,
	treeRelationship,
	tag,
	attachment
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { getCategories, getCategoryPages } from './category.service';
import { getTagsByUser } from './tag.service';

const UPLOAD_DIR = path.resolve('static/uploads');

// ─── Export ──────────────────────────────────────────────────────────────────

async function exportAttachments(userId: string) {
	const records = await db.select().from(attachment).where(eq(attachment.userId, userId)).all();

	const result = [];
	for (const rec of records) {
		try {
			const filePath = path.join(UPLOAD_DIR, userId, rec.storedName);
			const buffer = await readFile(filePath);
			result.push({
				id: rec.id,
				pageId: rec.pageId,
				originalName: rec.originalName,
				mimeType: rec.mimeType,
				size: rec.size,
				data: buffer.toString('base64')
			});
		} catch {
			// Skip files that can't be read
		}
	}
	return result;
}

export async function exportUserData(userId: string) {
	const cats = await getCategories(userId);
	const tags = await getTagsByUser(userId);

	const allTreeElements = await db
		.select()
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();

	const elementIds = new Set(allTreeElements.map((e) => e.id));
	const allRels = await db.select().from(treeRelationship).all();
	const userRels = allRels.filter((r) => elementIds.has(r.parentId) || elementIds.has(r.childId));

	const pageIds = new Set<string>();
	for (const cat of cats) {
		const pages = await getCategoryPages(userId, cat.id);
		for (const pg of pages) pageIds.add(pg.id);
	}
	const pageRels = allRels.filter((r) => pageIds.has(r.parentId));

	const categoriesWithPages = await Promise.all(
		cats.map(async (cat) => {
			const pages = await getCategoryPages(userId, cat.id);
			return {
				id: cat.id,
				name: cat.name,
				description: cat.description,
				icon: cat.icon,
				iconColor: cat.iconColor,
				accentColor: cat.accentColor,
				backgroundColor: cat.backgroundColor,
				imageUrl: cat.imageUrl,
				position: cat.position,
				pages: pages.map((p) => ({
					id: p.id,
					name: p.name,
					description: p.description,
					icon: p.icon,
					iconColor: p.iconColor,
					accentColor: p.accentColor,
					backgroundColor: p.backgroundColor,
					imageUrl: p.imageUrl,
					coverImageUrl: p.coverImageUrl,
					markdown: p.markdown,
					position: p.position
				}))
			};
		})
	);

	const attachments = await exportAttachments(userId);

	return {
		version: 2 as const,
		exportedAt: new Date().toISOString(),
		categories: categoriesWithPages,
		treeElements: allTreeElements.map((el) => ({
			id: el.id,
			type: el.type,
			name: el.name,
			description: el.description,
			markdown: el.markdown,
			imageUrl: el.imageUrl,
			videoUrl: el.videoUrl,
			externalUrl: el.externalUrl,
			tags: el.tags,
			metadata: el.metadata,
			ydkData: el.ydkData
		})),
		treeRelationships: [...userRels, ...pageRels].map((r) => ({
			parentType: r.parentType as 'page' | 'node' | 'item',
			parentId: r.parentId,
			childType: r.childType as 'node' | 'item',
			childId: r.childId,
			position: r.position
		})),
		tags: tags.map((t) => ({
			id: t.id,
			name: t.name,
			color: t.color
		})),
		attachments
	};
}

// ─── Import (non-destructive) ────────────────────────────────────────────────

async function findExisting(dbTable: any, whereClause: any) {
	return db.select({ id: dbTable.id }).from(dbTable).where(whereClause).get();
}

export async function importUserData(userId: string, data: any) {
	if (!data || (data.version !== 1 && data.version !== 2)) {
		return { success: false, message: 'Invalid backup format', counts: {} };
	}

	const idMap = new Map<string, string>();
	const counts = {
		categories: 0,
		pages: 0,
		elements: 0,
		relationships: 0,
		tags: 0,
		attachments: 0,
		skipped: 0
	};

	// 1. Tags — skip if name already exists
	for (const t of data.tags ?? []) {
		const existing = await findExisting(tag, and(eq(tag.userId, userId), eq(tag.name, t.name)));
		if (existing) {
			idMap.set(t.id, existing.id);
			counts.skipped++;
		} else {
			const newId = crypto.randomUUID();
			idMap.set(t.id, newId);
			db.insert(tag).values({ id: newId, userId, name: t.name, color: t.color }).run();
			counts.tags++;
		}
	}

	// 2. Categories — skip if name already exists
	for (const cat of data.categories ?? []) {
		const existing = await findExisting(
			category,
			and(eq(category.userId, userId), eq(category.name, cat.name))
		);
		let catId: string;
		if (existing) {
			catId = existing.id;
			idMap.set(cat.id, catId);
			counts.skipped++;
		} else {
			catId = crypto.randomUUID();
			idMap.set(cat.id, catId);
			db.insert(category)
				.values({
					id: catId,
					userId,
					name: cat.name,
					description: cat.description,
					icon: cat.icon,
					iconColor: cat.iconColor,
					accentColor: cat.accentColor,
					backgroundColor: cat.backgroundColor,
					imageUrl: cat.imageUrl,
					position: cat.position
				})
				.run();
			counts.categories++;
		}

		// 3. Pages — skip if name already exists within this category
		for (const pg of cat.pages ?? []) {
			const existingPage = await findExisting(
				page,
				and(eq(page.userId, userId), eq(page.categoryId, catId), eq(page.name, pg.name))
			);
			if (existingPage) {
				idMap.set(pg.id, existingPage.id);
				counts.skipped++;
			} else {
				const newPageId = crypto.randomUUID();
				idMap.set(pg.id, newPageId);
				db.insert(page)
					.values({
						id: newPageId,
						userId,
						categoryId: catId,
						name: pg.name,
						description: pg.description,
						icon: pg.icon,
						iconColor: pg.iconColor,
						accentColor: pg.accentColor,
						backgroundColor: pg.backgroundColor,
						imageUrl: pg.imageUrl,
						coverImageUrl: pg.coverImageUrl,
						markdown: pg.markdown,
						position: pg.position
					})
					.run();
				counts.pages++;
			}
		}
	}

	// 4. Tree elements — skip if name+type already exists (same user)
	for (const el of data.treeElements ?? []) {
		const existing = await findExisting(
			treeElement,
			and(
				eq(treeElement.userId, userId),
				eq(treeElement.name, el.name),
				eq(treeElement.type, el.type)
			)
		);
		if (existing) {
			idMap.set(el.id, existing.id);
			counts.skipped++;
		} else {
			const newId = crypto.randomUUID();
			idMap.set(el.id, newId);
			db.insert(treeElement)
				.values({
					id: newId,
					userId,
					type: el.type,
					name: el.name,
					description: el.description,
					markdown: el.markdown,
					imageUrl: el.imageUrl,
					videoUrl: el.videoUrl,
					externalUrl: el.externalUrl,
					tags: el.tags,
					metadata: el.metadata,
					ydkData: el.ydkData
				})
				.run();
			counts.elements++;
		}
	}

	// 5. Relationships — only if both parent and child were imported (not skipped)
	for (const rel of data.treeRelationships ?? []) {
		const newParentId = idMap.get(rel.parentId);
		const newChildId = idMap.get(rel.childId);
		if (newParentId && newChildId) {
			const existing = await findExisting(
				treeRelationship,
				and(
					eq(treeRelationship.parentType, rel.parentType),
					eq(treeRelationship.parentId, newParentId),
					eq(treeRelationship.childType, rel.childType),
					eq(treeRelationship.childId, newChildId)
				)
			);
			if (!existing) {
				db.insert(treeRelationship)
					.values({
						parentType: rel.parentType,
						parentId: newParentId,
						childType: rel.childType,
						childId: newChildId,
						position: rel.position
					})
					.run();
				counts.relationships++;
			} else {
				counts.skipped++;
			}
		}
	}

	// 6. Attachments (v2 only) — skip if page was skipped (id not mapped to new)
	if (data.attachments) {
		for (const att of data.attachments) {
			const newPageId = idMap.get(att.pageId);
			if (!newPageId) {
				counts.skipped++;
				continue;
			}

			const existing = await findExisting(
				attachment,
				and(
					eq(attachment.userId, userId),
					eq(attachment.pageId, newPageId),
					eq(attachment.originalName, att.originalName)
				)
			);
			if (existing) {
				counts.skipped++;
				continue;
			}

			// Write file to disk
			const userDir = path.join(UPLOAD_DIR, userId);
			const ext = path.extname(att.originalName);
			const storedName = `${crypto.randomUUID()}${ext}`;
			const filePath = path.join(userDir, storedName);

			const { mkdirSync } = await import('fs');
			mkdirSync(userDir, { recursive: true });
			const { writeFileSync } = await import('fs');
			writeFileSync(filePath, Buffer.from(att.data, 'base64'));

			db.insert(attachment)
				.values({
					userId,
					pageId: newPageId,
					originalName: att.originalName,
					storedName,
					mimeType: att.mimeType,
					size: att.size
				})
				.run();
			counts.attachments++;
		}
	}

	const imported =
		counts.categories +
		counts.pages +
		counts.elements +
		counts.relationships +
		counts.tags +
		counts.attachments;
	return {
		success: true,
		message:
			counts.skipped > 0
				? `Imported ${imported} items, skipped ${counts.skipped} duplicates`
				: `Imported ${imported} items successfully`,
		counts
	};
}
