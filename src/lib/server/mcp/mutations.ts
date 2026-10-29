import { getTagsByUser } from '$lib/server/services/tag.service';
import { updatePage as updatePageRecord } from '$lib/server/services/page.service';
import { updateTreeElement } from '$lib/server/services/tree.service';
import { getItem, getPage, ToolInputError } from './queries';

// Write operations behind the MCP edit tools. Like the read queries, every
// function takes the user id resolved from the bearer token, and the services
// it calls scope their UPDATE by that id, so a token can never touch another
// account's rows.

export interface UpdateItemArgs {
	id: string;
	name?: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	videoUrl?: string | null;
	externalUrl?: string | null;
	tags?: string[];
	favorite?: boolean;
}

export interface UpdatePageArgs {
	id: string;
	name?: string;
	description?: string | null;
	markdown?: string | null;
	imageUrl?: string | null;
	coverImageUrl?: string | null;
	icon?: string | null;
}

/** An omitted field stays untouched; null or "" clears a nullable field. */
function cleanText(value: string | null | undefined): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;
	return value.trim().length > 0 ? value : null;
}

function cleanName(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const name = value.trim();
	if (!name) throw new ToolInputError('"name" cannot be empty.');
	return name;
}

/** Only public http(s) URLs are accepted, matching what the app can render. */
function cleanUrl(value: string | null | undefined, field: string): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null || value.trim() === '') return null;
	const candidate = value.trim();
	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		throw new ToolInputError(`"${field}" must be a full http(s) URL.`);
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new ToolInputError(`"${field}" must use http or https.`);
	}
	return candidate;
}

/**
 * Tags are stored as JSON ids. The caller may pass ids or names (the same
 * convenience list_* tools use); unknown tags are an error instead of being
 * created silently, so a typo cannot spawn a duplicate tag.
 */
async function resolveTagIds(userId: string, values: string[]): Promise<string[]> {
	const tags = await getTagsByUser(userId);
	const byId = new Map(tags.map((row) => [row.id, row]));
	const byName = new Map(tags.map((row) => [row.name.toLowerCase(), row]));

	const ids = new Set<string>();
	const unknown: string[] = [];
	for (const raw of values) {
		const value = raw.trim();
		const match = byId.get(value) ?? byName.get(value.toLowerCase());
		if (match) ids.add(match.id);
		else unknown.push(value);
	}

	if (unknown.length > 0) {
		throw new ToolInputError(
			`Unknown tag${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Use list_tags to see the available tags.`
		);
	}
	return [...ids];
}

export async function updateItem(userId: string, args: UpdateItemArgs) {
	const patch: Parameters<typeof updateTreeElement>[2] = {};

	const name = cleanName(args.name);
	if (name !== undefined) patch.name = name;
	const description = cleanText(args.description);
	if (description !== undefined) patch.description = description;
	const markdown = cleanText(args.markdown);
	if (markdown !== undefined) patch.markdown = markdown;
	const imageUrl = cleanUrl(args.imageUrl, 'imageUrl');
	if (imageUrl !== undefined) patch.imageUrl = imageUrl;
	const videoUrl = cleanUrl(args.videoUrl, 'videoUrl');
	if (videoUrl !== undefined) patch.videoUrl = videoUrl;
	const externalUrl = cleanUrl(args.externalUrl, 'externalUrl');
	if (externalUrl !== undefined) patch.externalUrl = externalUrl;
	if (args.tags !== undefined) patch.tags = JSON.stringify(await resolveTagIds(userId, args.tags));
	if (args.favorite !== undefined) patch.favorite = args.favorite;

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one field to update.');
	}

	const element = await updateTreeElement(userId, args.id, patch);
	if (!element) throw new ToolInputError(`No item or node with id "${args.id}".`);

	const detail = await getItem(userId, args.id, 1);
	return { changed, item: detail.item };
}

export async function updatePage(userId: string, args: UpdatePageArgs) {
	const patch: Parameters<typeof updatePageRecord>[2] = {};

	const name = cleanName(args.name);
	if (name !== undefined) patch.name = name;
	const description = cleanText(args.description);
	if (description !== undefined) patch.description = description;
	const markdown = cleanText(args.markdown);
	if (markdown !== undefined) patch.markdown = markdown;
	const imageUrl = cleanUrl(args.imageUrl, 'imageUrl');
	if (imageUrl !== undefined) patch.imageUrl = imageUrl;
	const coverImageUrl = cleanUrl(args.coverImageUrl, 'coverImageUrl');
	if (coverImageUrl !== undefined) patch.coverImageUrl = coverImageUrl;
	const icon = cleanText(args.icon);
	if (icon !== undefined) patch.icon = icon;

	const changed = Object.keys(patch);
	if (changed.length === 0) {
		throw new ToolInputError('Provide at least one field to update.');
	}

	const row = await updatePageRecord(userId, args.id, patch);
	if (!row) throw new ToolInputError(`No page with id "${args.id}".`);

	const detail = await getPage(userId, args.id, 1);
	return { changed, page: detail.page };
}
