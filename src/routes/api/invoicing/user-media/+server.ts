import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveUserMediaFile, getUserMediaFilePath } from '$lib/server/services/invoice.service';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const type = url.searchParams.get('type') as 'signature' | 'stamp' | null;
	if (type !== 'signature' && type !== 'stamp') {
		return json({ error: 'Type must be signature or stamp' }, { status: 400 });
	}

	const filePath = await getUserMediaFilePath(locals.user.id, type);
	if (!filePath) {
		return json({ error: 'Image not found' }, { status: 404 });
	}

	const fileStat = await stat(filePath);
	const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
	const ext = path.extname(filePath).toLowerCase();
	let mime = 'image/png';
	if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
	else if (ext === '.webp') mime = 'image/webp';
	else if (ext === '.svg') mime = 'image/svg+xml';

	return new Response(stream, {
		headers: {
			'Content-Type': mime,
			'Content-Length': fileStat.size.toString(),
			'Cache-Control': 'private, max-age=60',
			'Content-Disposition': 'inline'
		}
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const formData = await request.formData();
		const type = formData.get('type')?.toString() as 'signature' | 'stamp';
		const file = formData.get('file') as File | null;

		if (type !== 'signature' && type !== 'stamp') {
			return json({ error: 'Type must be signature or stamp' }, { status: 400 });
		}
		if (!file) {
			return json({ error: 'File is required' }, { status: 400 });
		}

		const res = await saveUserMediaFile(locals.user.id, type, file);
		return json(res);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to save media file';
		return json({ error: msg }, { status: 500 });
	}
};
