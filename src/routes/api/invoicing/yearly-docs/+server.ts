import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getYearlyDocs,
	getYearlyDocById,
	saveYearlyDocFile,
	getYearlyDocFilePath,
	deleteYearlyDoc
} from '$lib/server/services/invoice.service';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	if (id) {
		const doc = await getYearlyDocById(locals.user.id, id);
		if (!doc) return json({ error: 'Document not found' }, { status: 404 });

		const filePath = await getYearlyDocFilePath(locals.user.id, doc.storedName);
		if (!filePath) return json({ error: 'File on disk not found' }, { status: 404 });

		const fileStat = await stat(filePath);
		const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

		const isPdf = doc.mimeType === 'application/pdf';
		const isImage = doc.mimeType.startsWith('image/');
		const inline = isPdf || isImage;

		return new Response(stream, {
			headers: {
				'Content-Type': doc.mimeType || 'application/octet-stream',
				'Content-Length': fileStat.size.toString(),
				'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(doc.originalName)}"`,
				'Cache-Control': 'private, max-age=3600',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}

	const yearParam = url.searchParams.get('year');
	if (!yearParam) return json({ error: 'Year or id is required' }, { status: 400 });

	const year = parseInt(yearParam, 10);
	const docs = await getYearlyDocs(locals.user.id, year);
	return json(docs);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const formData = await request.formData();
		const yearStr = formData.get('year')?.toString();
		const docType = formData.get('docType')?.toString() as 'g12' | 'g12_bis';
		const file = formData.get('file') as File | null;

		if (!yearStr || !docType || !file) {
			return json({ error: 'Year, docType and file are required' }, { status: 400 });
		}

		if (docType !== 'g12' && docType !== 'g12_bis') {
			return json({ error: 'Invalid docType. Must be g12 or g12_bis' }, { status: 400 });
		}

		const year = parseInt(yearStr, 10);
		if (isNaN(year)) {
			return json({ error: 'Invalid year' }, { status: 400 });
		}

		const doc = await saveYearlyDocFile(locals.user.id, year, docType, file);
		return json(doc, { status: 201 });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to save document';
		return json({ error: msg }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const id = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id;
		if (!id) return json({ error: 'Document id is required' }, { status: 400 });

		const ok = await deleteYearlyDoc(locals.user.id, id);
		if (!ok) return json({ error: 'Document not found' }, { status: 404 });
		return json({ success: true });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to delete document';
		return json({ error: msg }, { status: 400 });
	}
};
