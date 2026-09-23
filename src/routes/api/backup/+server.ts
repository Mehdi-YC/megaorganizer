import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exportUserData, importUserData } from '$lib/server/services/backup.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	return json(await exportUserData(locals.user.id));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, message: 'Invalid backup file' }, { status: 400 });
	}

	try {
		const result = await importUserData(locals.user.id, body);
		return json(result);
	} catch (err) {
		console.error('backup import failed:', err);
		// Keep error detail out of responses (SQL/filesystem internals)
		return json({ success: false, message: 'Import failed' }, { status: 500 });
	}
};
