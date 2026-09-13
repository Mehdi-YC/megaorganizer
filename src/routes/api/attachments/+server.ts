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
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	const pageId = url.searchParams.get('pageId');

	if (id) {
		// Serve file for download/preview
		const record = await getAttachmentById(locals.user.id, id);
		if (!record) {
			return json({ error: 'Not found' }, { status: 404 });
		}

		const filePath = await getAttachmentFilePath(locals.user.id, record.storedName);
		if (!filePath) {
			return json({ error: 'File not found on disk' }, { status: 404 });
		}

		const fileStat = await stat(filePath);
		const stream = createReadStream(filePath);
		const webStream = Readable.toWeb(stream) as ReadableStream;

		return new Response(webStream, {
			headers: {
				'Content-Type': record.mimeType,
				'Content-Length': fileStat.size.toString(),
				'Content-Disposition': `inline; filename="${encodeURIComponent(record.originalName)}"`,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	}

	if (pageId) {
		const attachments = await getAttachmentsByPage(locals.user.id, pageId);
		return json(attachments);
	}

	return json({ error: 'pageId required' }, { status: 400 });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const pageId = formData.get('pageId')?.toString();
		const file = formData.get('file') as File | null;

		if (!pageId) {
			return json({ error: 'pageId required' }, { status: 400 });
		}

		if (!file || file.size === 0) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		const result = await uploadAttachment(locals.user.id, pageId, file);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (err) {
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const id = body.id;

	if (!id) {
		return json({ error: 'id required' }, { status: 400 });
	}

	const success = await deleteAttachment(locals.user.id, id);
	if (!success) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({ success: true });
};
