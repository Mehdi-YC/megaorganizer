import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isNonEmptyString, isString } from '$lib/server/validate';
import { getDashboardNote, saveDashboardNote } from '$lib/server/services/dashboard.service';

// GET: the user's dashboard note.
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json({ content: await getDashboardNote(user.id) });
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'save': {
			const v = validateBody(body, {
				content: { validate: isString, label: 'Note' }
			});
			if (!v.ok) return v.error;
			await saveDashboardNote(user.id, v.data.content);
			return json({ content: v.data.content });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
