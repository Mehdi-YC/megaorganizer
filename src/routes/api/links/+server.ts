import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveTargetByName } from '$lib/server/services/wikilink.service';
import { requireUser } from '$lib/server/api-helpers';

// Resolve one wikilink target name to an in-app href. Used by the
// click-to-resolve handler for rendered links that arrive without a map.
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const target = event.url.searchParams.get('target')?.trim() ?? '';
	if (!target) return json({ href: null });

	const href = await resolveTargetByName(user.id, target);
	return json({ href });
};
