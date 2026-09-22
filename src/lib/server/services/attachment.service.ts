import { db } from '$lib/server/db';
import { attachment, page } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('static/uploads');
const MAX_SIZE = 100 * 1024 * 1024;

// Allowed mime types for security
const ALLOWED_MIME_TYPES = new Set([
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/bmp',
	// Videos
	'tvideo/mp4',
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
	if (file.size > MAX_SIZE)
		return { success: false as const, error: 'File size exceeds 100MB limit' };

	// Validate file extension
	const ext = path.extname(file.name).toLowerCase();
	if (BLOCKED_EXTENSIONS.has(ext)) {
		return { success: false as const, error: 'File type not allowed for security reasons' };
	}

	// Validate mime type (if provided)
	if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
		return { success: false as const, error: 'File type not allowed' };
	}

	// Sanitize filename - remove path separators and null bytes
	// eslint-disable-next-line no-control-regex
	const sanitizedName = file.name.replace(/[/\\:*?"<>|\x00]/g, '_');
	if (!sanitizedName || sanitizedName.trim().length === 0) {
		return { success: false as const, error: 'Invalid filename' };
	}

	const dir = userDir(userId);
	if (!existsSync(dir)) await mkdir(dir, { recursive: true });

	const storedName = `${crypto.randomUUID()}${ext}`;
	const filePath = path.join(dir, storedName);

	// Verify the resolved path is within the upload directory (prevent path traversal)
	const resolvedPath = path.resolve(filePath);
	if (!resolvedPath.startsWith(path.resolve(dir))) {
		return { success: false as const, error: 'Invalid file path' };
	}

	await writeFile(resolvedPath, Buffer.from(await file.arrayBuffer()));

	const [result] = await db
		.insert(attachment)
		.values({
			userId,
			pageId,
			originalName: file.name,
			storedName,
			mimeType: file.type || 'application/octet-stream',
			size: file.size
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
	const filePath = path.join(userDir(userId), storedName);
	try {
		await stat(filePath);
		return filePath;
	} catch {
		return null;
	}
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
		/* ignore */
	}
	await db
		.delete(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)));
	return true;
}
