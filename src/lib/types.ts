// Shared shapes for data that crosses the client/server boundary.
//
// Most of these exist because the corresponding helper in src/lib/utils was
// typed `any` and the compiler had nothing to check against. They describe
// what the code actually uses, not every column in the schema: the server
// sends full rows, and these are the fields the client touches.

/** A row of the tree_element table, as delivered to a page. */
export interface TreeElement {
	id: string;
	userId?: string;
	/** 'node' groups other elements, 'item' is a leaf. */
	type: 'node' | 'item';
	name: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	videoUrl?: string | null;
	externalUrl?: string | null;
	/** JSON array of tag ids, stored as text. */
	tags?: string | null;
	/** JSON object; see parseMetadata. */
	metadata?: string | null;
	ydkData?: string | null;
	favorite?: boolean | null;
	/** Drizzle maps these to Date on the server; they cross the wire as strings. */
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
	/** Only present on children fetched through getChildren. */
	position?: number;
	/** Only present on nodes assembled by getFullTree / getSubtreeForItem. */
	children?: TreeElement[];
}

/** The shape getFullTree and getSubtreeForItem build: a node with children. */
export type TreeElementNode = TreeElement & { children: TreeElementNode[] };

export interface Tag {
	id: string;
	name: string;
	color?: string | null;
}

/** Anything carrying the fields getAssignedTags and getTagIds read. */
export interface Taggable {
	tags?: string | null;
}

/** Colour and icon overrides parsed out of a node's metadata column. */
export interface NodeMetadata {
	color?: string;
	icon?: string;
	[key: string]: unknown;
}

/** A page row as the sidebar and category pages use it. */
export interface PageSummary {
	id: string;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
	updatedAt?: string | null;
}

/** A category row with its pages nested, as the sidebar expects. */
export interface CategoryWithPages {
	id: string;
	name: string;
	color?: string | null;
	icon?: string | null;
	updatedAt?: string | null;
	pages?: PageSummary[];
}

/** Attachment metadata, as the page's attachment grid renders it. */
export interface Attachment {
	id: string;
	originalName: string;
	mimeType: string;
	size: number;
	url?: string;
	createdAt?: string | null;
}
