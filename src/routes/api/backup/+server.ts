import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exportUserData, importUserData, type BackupData } from '$lib/server/services/backup.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await exportUserData(locals.user.id);
	return json(data);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const result = await importUserData(locals.user.id, body as BackupData);
		return json(result);
	} catch (err) {
		return json({ success: false, message: 'Failed to import data: invalid format' }, { status: 400 });
	}
};
