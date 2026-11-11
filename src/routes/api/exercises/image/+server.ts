import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	saveExerciseImage,
	getExerciseImageFile,
	deleteExerciseImage
} from '$lib/server/services/exercise.service';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	const name = url.searchParams.get('name');
	if (!id || !name) return json({ error: 'id and name required' }, { status: 400 });

	const file = await getExerciseImageFile(locals.user.id, id, name);
	if (!file) return json({ error: 'Not found' }, { status: 404 });

	const fileStat = await stat(file.path);
	const stream = Readable.toWeb(createReadStream(file.path)) as ReadableStream;

	return new Response(stream, {
		headers: {
			'Content-Type': file.mimeType,
			'Content-Length': fileStat.size.toString(),
			'Content-Disposition': 'inline',
			'Cache-Control': 'private, max-age=3600',
			'Content-Security-Policy': "default-src 'none'; sandbox",
			'X-Content-Type-Options': 'nosniff'
		}
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const id = formData.get('id')?.toString();
	const file = formData.get('file') as File | null;

	if (!id) return json({ error: 'id required' }, { status: 400 });
	if (!file || file.size === 0) return json({ error: 'No file provided' }, { status: 400 });

	const result = await saveExerciseImage(locals.user.id, id, file);
	if (!result.ok) return json({ error: result.error }, { status: 400 });
	return json({ images: result.images }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	const name = url.searchParams.get('name');
	if (!id || !name) return json({ error: 'id and name required' }, { status: 400 });

	const deleted = await deleteExerciseImage(locals.user.id, id, name);
	if (!deleted) return json({ error: 'Image not found' }, { status: 404 });
	return json({ success: true });
};
