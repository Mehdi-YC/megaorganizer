import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	exportUserData,
	exportUserDataZip,
	importUserData,
	importUserDataFromZip
} from '$lib/server/services/backup.service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (url.searchParams.get('format') === 'json') {
		return json(await exportUserData(locals.user.id));
	}

	const zipBuffer = await exportUserDataZip(locals.user.id);
	const filename = `megaorganize-backup-${new Date().toISOString().slice(0, 10)}.zip`;

	return new Response(new Uint8Array(zipBuffer), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const contentType = request.headers.get('content-type') || '';

	try {
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('file') as File | null;
			if (!file) return json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			if (
				file.name.endsWith('.zip') ||
				file.type === 'application/zip' ||
				file.type === 'application/x-zip-compressed'
			) {
				const result = await importUserDataFromZip(locals.user.id, buffer);
				return json(result);
			} else {
				const jsonText = buffer.toString('utf-8');
				const data = JSON.parse(jsonText);
				const result = await importUserData(locals.user.id, data);
				return json(result);
			}
		}

		if (contentType.includes('application/zip')) {
			const arrayBuffer = await request.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const result = await importUserDataFromZip(locals.user.id, buffer);
			return json(result);
		}

		// Fallback to JSON payload
		const body = await request.json();
		const result = await importUserData(locals.user.id, body);
		return json(result);
	} catch (err) {
		console.error('backup import failed:', err);
		return json(
			{
				success: false,
				message: err instanceof Error ? err.message : 'Échec de la restauration de la sauvegarde'
			},
			{ status: 500 }
		);
	}
};
