import { db } from '$lib/server/db';
import { attachment, page } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('static/uploads');
const MAX_SIZE = 100 * 1024 * 1024;

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
	const pageRecord = await db.select({ id: page.id }).from(page).where(and(eq(page.id, pageId), eq(page.userId, userId))).get();
	if (!pageRecord) return { success: false as const, error: 'Page not found' };
	if (file.size > MAX_SIZE) return { success: false as const, error: 'File size exceeds 100MB limit' };

	const dir = userDir(userId);
	if (!existsSync(dir)) await mkdir(dir, { recursive: true });

	const ext = path.extname(file.name);
	const storedName = `${crypto.randomUUID()}${ext}`;
	await writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));

	const [result] = await db.insert(attachment).values({
		userId, pageId, originalName: file.name, storedName,
		mimeType: file.type || 'application/octet-stream', size: file.size
	}).returning();

	return { success: true as const, data: toResponse(result) };
}

export async function getAttachmentsByPage(userId: string, pageId: string): Promise<AttachmentData[]> {
	return db.select().from(attachment)
		.where(and(eq(attachment.userId, userId), eq(attachment.pageId, pageId)))
		.all().then((rows) => rows.map(toResponse));
}

export async function getAttachmentById(userId: string, attachmentId: string) {
	return db.select().from(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
		.get();
}

export async function getAttachmentFilePath(userId: string, storedName: string): Promise<string | null> {
	const filePath = path.join(userDir(userId), storedName);
	try { await stat(filePath); return filePath; } catch { return null; }
}

export async function deleteAttachment(userId: string, attachmentId: string): Promise<boolean> {
	const record = await db.select().from(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
		.get();
	if (!record) return false;

	try { await unlink(path.join(userDir(userId), record.storedName)); } catch {}
	await db.delete(attachment).where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)));
	return true;
}
