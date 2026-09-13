import { db } from '$lib/server/db';
import {
	category,
	page,
	treeElement,
	treeRelationship,
	tag
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	getCategories,
	getCategoryPages
} from './category.service';
import { getTagsByUser } from './tag.service';

export interface BackupData {
	version: 1;
	exportedAt: string;
	categories: Array<{
		id: string;
		name: string;
		description: string | null;
		icon: string | null;
		iconColor: string | null;
		accentColor: string | null;
		backgroundColor: string | null;
		imageUrl: string | null;
		position: number;
		pages: Array<{
			id: string;
			name: string;
			description: string | null;
			icon: string | null;
			iconColor: string | null;
			accentColor: string | null;
			backgroundColor: string | null;
			imageUrl: string | null;
			coverImageUrl: string | null;
			markdown: string | null;
			position: number;
		}>;
	}>;
	treeElements: Array<{
		id: string;
		type: 'node' | 'item';
		name: string;
		description: string | null;
		markdown: string | null;
		imageUrl: string | null;
		videoUrl: string | null;
		externalUrl: string | null;
		tags: string | null;
		metadata: string | null;
		ydkData: string | null;
	}>;
	treeRelationships: Array<{
		parentType: 'page' | 'node' | 'item';
		parentId: string;
		childType: 'node' | 'item';
		childId: string;
		position: number;
	}>;
	tags: Array<{
		id: string;
		name: string;
		color: string | null;
	}>;
}

export async function exportUserData(userId: string): Promise<BackupData> {
	const cats = await getCategories(userId);
	const tags = await getTagsByUser(userId);

	const allTreeElements = await db
		.select()
		.from(treeElement)
		.where(eq(treeElement.userId, userId))
		.all();

	const elementIds = new Set(allTreeElements.map((e) => e.id));
	const allRels = await db.select().from(treeRelationship).all();
	const userRels = allRels.filter(
		(r) => elementIds.has(r.parentId) || elementIds.has(r.childId)
	);

	// Also get page-parented relationships
	const pageIds = new Set<string>();
	for (const cat of cats) {
		const pages = await getCategoryPages(userId, cat.id);
		for (const pg of pages) {
			pageIds.add(pg.id);
		}
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

	return {
		version: 1,
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
		}))
	};
}

export async function importUserData(
	userId: string,
	data: BackupData
): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
	if (!data || data.version !== 1) {
		return { success: false, message: 'Invalid backup format', counts: {} };
	}

	// Build ID mapping: old ID -> new ID
	const idMap = new Map<string, string>();

	const counts: Record<string, number> = { categories: 0, pages: 0, elements: 0, relationships: 0, tags: 0 };

	// 1. Import tags first (no dependencies)
	for (const t of data.tags) {
		const newId = crypto.randomUUID();
		idMap.set(t.id, newId);
		db.insert(tag)
			.values({ id: newId, userId, name: t.name, color: t.color })
			.run();
		counts.tags++;
	}

	// 2. Import categories (no dependencies)
	for (const cat of data.categories) {
		const newId = crypto.randomUUID();
		idMap.set(cat.id, newId);
		db.insert(category)
			.values({
				id: newId,
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

		// 3. Import pages within each category
		for (const pg of cat.pages) {
			const newPageId = crypto.randomUUID();
			idMap.set(pg.id, newPageId);
			db.insert(page)
				.values({
					id: newPageId,
					userId,
					categoryId: newId,
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

	// 4. Import tree elements
	for (const el of data.treeElements) {
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

	// 5. Import tree relationships (map old IDs to new)
	for (const rel of data.treeRelationships) {
		const newParentId = idMap.get(rel.parentId);
		const newChildId = idMap.get(rel.childId);
		if (newParentId && newChildId) {
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
		}
	}

	const total = counts.categories + counts.pages + counts.elements + counts.relationships + counts.tags;
	return {
		success: true,
		message: `Imported ${total} items successfully`,
		counts
	};
}
