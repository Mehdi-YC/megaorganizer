import { db } from '$lib/server/db';
import { attachment, page } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import path from 'path';

// Uploads live outside static/ so files are never served without auth.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'data/uploads');
// Installs older than this change kept files under static/uploads; reads
// fall back there until files are moved.
const LEGACY_UPLOAD_DIR = path.resolve('static/uploads');
const MAX_SIZE = 100 * 1024 * 1024;

// Allowed mime types for security
const ALLOWED_MIME_TYPES = new Set([
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/bmp',
	// Videos
	'video/mp4',
	'video/webm',
	'video/quicktime',
	// Audio
	'audio/mpeg',
	'audio/wav',
	'audio/ogg',
	'audio/webm',
	// Documents
	'application/pdf',
	'text/plain',
	'text/markdown',
	'text/csv',
	'application/json',
	// Archives (for backups)
	'application/zip',
	'application/gzip',
	// Office (common)
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

// Dangerous file extensions to block
const BLOCKED_EXTENSIONS = new Set([
	'.exe',
	'.bat',
	'.cmd',
	'.com',
	'.msi',
	'.ps1',
	'.sh',
	'.bash',
	'.php',
	'.asp',
	'.aspx',
	'.jsp',
	'.cgi',
	'.js',
	'.mjs',
	'.ts',
	'.jsx',
	'.tsx',
	'.vbs',
	'.wsf',
	'.scr',
	'.pif'
]);

function userDir(userId: string) {
	return path.join(UPLOAD_DIR, userId);
}

function mimeCategory(mime: string): string {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	if (mime === 'application/pdf') return 'pdf';
	if (mime.startsWith('audio/')) return 'audio';
	return 'file';
}

/**
 * Validate and write an attachment file to disk. Used by both the upload
 * endpoint and backup import, the one path hostile files enter through.
 * An empty mime becomes octet-stream (always served as a download); any
 * provided mime must be on the allowlist.
 */
export async function saveAttachmentFile(
	userId: string,
	originalName: string,
	mimeType: string,
	data: Buffer
): Promise<
	{ ok: true; storedName: string; mimeType: string; size: number } | { ok: false; error: string }
> {
	if (data.length > MAX_SIZE) return { ok: false, error: 'File size exceeds 100MB limit' };

	const ext = path.extname(originalName).toLowerCase();
	if (BLOCKED_EXTENSIONS.has(ext)) {
		return { ok: false, error: 'File type not allowed for security reasons' };
	}
	const mime = mimeType || 'application/octet-stream';
	if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
		return { ok: false, error: 'File type not allowed' };
	}

	// Sanitize filename - remove path separators and null bytes
	// eslint-disable-next-line no-control-regex
	const sanitizedName = originalName.replace(/[/\\:*?"<>|\x00]/g, '_');
	if (!sanitizedName || sanitizedName.trim().length === 0) {
		return { ok: false, error: 'Invalid filename' };
	}

	const dir = userDir(userId);
	await mkdir(dir, { recursive: true });

	const storedName = `${crypto.randomUUID()}${ext}`;
	const resolvedPath = path.resolve(dir, storedName);
	// Verify the resolved path is within the upload directory (prevent path traversal)
	if (!resolvedPath.startsWith(path.resolve(dir))) {
		return { ok: false, error: 'Invalid file path' };
	}

	await writeFile(resolvedPath, data);
	return { ok: true, storedName, mimeType: mime, size: data.length };
}

export interface AttachmentData {
	id: string;
	originalName: string;
	mimeType: string;
	size: number;
	createdAt: Date;
	url: string;
	category: string;
}

function toResponse(a: any): AttachmentData {
	return {
		id: a.id,
		originalName: a.originalName,
		mimeType: a.mimeType,
		size: a.size,
		createdAt: a.createdAt,
		url: `/api/attachments?id=${a.id}`,
		category: mimeCategory(a.mimeType)
	};
}

export async function uploadAttachment(userId: string, pageId: string, file: File) {
	const pageRecord = await db
		.select({ id: page.id })
		.from(page)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)))
		.get();
	if (!pageRecord) return { success: false as const, error: 'Page not found' };

	const saved = await saveAttachmentFile(
		userId,
		file.name,
		file.type,
		Buffer.from(await file.arrayBuffer())
	);
	if (!saved.ok) return { success: false as const, error: saved.error };

	const [result] = await db
		.insert(attachment)
		.values({
			userId,
			pageId,
			originalName: file.name,
			storedName: saved.storedName,
			mimeType: saved.mimeType,
			size: saved.size
		})
		.returning();

	return { success: true as const, data: toResponse(result) };
}

export async function getAttachmentsByPage(
	userId: string,
	pageId: string
): Promise<AttachmentData[]> {
	return db
		.select()
		.from(attachment)
		.where(and(eq(attachment.userId, userId), eq(attachment.pageId, pageId)))
		.all()
		.then((rows) => rows.map(toResponse));
}

export async function getAttachmentById(userId: string, attachmentId: string) {
	return db
		.select()
		.from(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
		.get();
}

export async function getAttachmentFilePath(
	userId: string,
	storedName: string
): Promise<string | null> {
	for (const root of [UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
		const filePath = path.join(root, userId, storedName);
		try {
			await stat(filePath);
			return filePath;
		} catch {
			// try the next root
		}
	}
	return null;
}

export async function deleteAttachment(userId: string, attachmentId: string): Promise<boolean> {
	const record = await db
		.select()
		.from(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
		.get();
	if (!record) return false;

	try {
		await unlink(path.join(userDir(userId), record.storedName));
	} catch {
		// also try the legacy directory
	}
	try {
		await unlink(path.join(LEGACY_UPLOAD_DIR, userId, record.storedName));
	} catch {
		/* ignore */
	}
	await db
		.delete(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)));
	return true;
}
