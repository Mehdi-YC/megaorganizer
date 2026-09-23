import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	uploadAttachment,
	getAttachmentsByPage,
	getAttachmentById,
	getAttachmentFilePath,
	deleteAttachment
} from '$lib/server/services/attachment.service';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	const pageId = url.searchParams.get('pageId');

	// Serve file
	if (id) {
		const record = await getAttachmentById(locals.user.id, id);
		if (!record) return json({ error: 'Not found' }, { status: 404 });

		const filePath = await getAttachmentFilePath(locals.user.id, record.storedName);
		if (!filePath) return json({ error: 'File not found' }, { status: 404 });

		const fileStat = await stat(filePath);
		const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

		// Only images, audio, video, and PDF render inline; everything else
		// downloads as octet-stream so no uploaded file can run in the app origin.
		const inlineSafe =
			record.mimeType === 'application/pdf' ||
			record.mimeType.startsWith('image/') ||
			record.mimeType.startsWith('video/') ||
			record.mimeType.startsWith('audio/');

		return new Response(stream, {
			headers: {
				'Content-Type': inlineSafe ? record.mimeType : 'application/octet-stream',
				'Content-Length': fileStat.size.toString(),
				'Content-Disposition': `${inlineSafe ? 'inline' : 'attachment'}; filename="${encodeURIComponent(record.originalName)}"`,
				'Cache-Control': 'private, max-age=3600',
				'Content-Security-Policy': "default-src 'none'; sandbox",
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}

	// List by page
	if (pageId) {
		return json(await getAttachmentsByPage(locals.user.id, pageId));
	}

	return json({ error: 'pageId required' }, { status: 400 });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const pageId = formData.get('pageId')?.toString();
	const file = formData.get('file') as File | null;

	if (!pageId) return json({ error: 'pageId required' }, { status: 400 });
	if (!file || file.size === 0) return json({ error: 'No file provided' }, { status: 400 });

	const result = await uploadAttachment(locals.user.id, pageId, file);
	if (!result.success) return json({ error: result.error }, { status: 400 });

	return json(result.data, { status: 201 });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = await request.json();
	if (!id) return json({ error: 'id required' }, { status: 400 });

	const ok = await deleteAttachment(locals.user.id, id);
	if (!ok) return json({ error: 'Not found' }, { status: 404 });

	return json({ success: true });
};
