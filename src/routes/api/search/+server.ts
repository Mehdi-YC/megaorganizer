import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalSearch } from '$lib/server/services/search.service';
import { requireUser } from '$lib/server/api-helpers';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const query = event.url.searchParams.get('q') || '';
	const limit = parseInt(event.url.searchParams.get('limit') || '20');

	if (!query || query.trim().length < 2) {
		return json([]);
	}

	const results = await globalSearch(user.id, query, limit);
	return json(results);
};