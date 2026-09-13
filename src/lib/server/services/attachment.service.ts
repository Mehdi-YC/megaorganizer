import { db } from '$lib/server/db';
import { attachment, page } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('static/uploads');
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function getUploadPath(userId: string): string {
	return path.join(UPLOAD_DIR, userId);
}

function getMimeCategory(mimeType: string): string {
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType === 'application/pdf') return 'pdf';
	if (mimeType.startsWith('audio/')) return 'audio';
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

export async function uploadAttachment(
	userId: string,
	pageId: string,
	file: File
): Promise<{ success: boolean; data?: AttachmentData; error?: string }> {
	// Verify page ownership
	const pageRecord = await db
		.select({ id: page.id })
		.from(page)
		.where(and(eq(page.id, pageId), eq(page.userId, userId)))
		.get();

	if (!pageRecord) {
		return { success: false, error: 'Page not found' };
	}

	// Check file size
	if (file.size > MAX_SIZE) {
		return { success: false, error: 'File size exceeds 100MB limit' };
	}

	// Ensure upload directory exists
	const uploadPath = getUploadPath(userId);
	if (!existsSync(uploadPath)) {
		await mkdir(uploadPath, { recursive: true });
	}

	// Generate stored name
	const ext = path.extname(file.name);
	const storedName = `${crypto.randomUUID()}${ext}`;
	const filePath = path.join(uploadPath, storedName);

	// Write file
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filePath, buffer);

	// Save to database
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

	const category = getMimeCategory(result.mimeType);
	const url = `/api/attachments?id=${result.id}`;

	return {
		success: true,
		data: {
			id: result.id,
			originalName: result.originalName,
			mimeType: result.mimeType,
			size: result.size,
			createdAt: result.createdAt,
			url,
			category
		}
	};
}

export async function getAttachmentsByPage(
	userId: string,
	pageId: string
): Promise<AttachmentData[]> {
	const results = await db
		.select()
		.from(attachment)
		.where(and(eq(attachment.userId, userId), eq(attachment.pageId, pageId)))
		.all();

	return results.map((a) => ({
		id: a.id,
		originalName: a.originalName,
		mimeType: a.mimeType,
		size: a.size,
		createdAt: a.createdAt,
		url: `/api/attachments?id=${a.id}`,
		category: getMimeCategory(a.mimeType)
	}));
}

export async function getAttachmentById(
	userId: string,
	attachmentId: string
) {
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
	const filePath = path.join(getUploadPath(userId), storedName);
	try {
		await stat(filePath);
		return filePath;
	} catch {
		return null;
	}
}

export async function deleteAttachment(
	userId: string,
	attachmentId: string
): Promise<boolean> {
	const record = await db
		.select()
		.from(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)))
		.get();

	if (!record) return false;

	// Delete file from disk
	const filePath = path.join(getUploadPath(userId), record.storedName);
	try {
		await unlink(filePath);
	} catch {
		// File may already be deleted
	}

	// Delete from database
	await db
		.delete(attachment)
		.where(and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)));

	return true;
}
