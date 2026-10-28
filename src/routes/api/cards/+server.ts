import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api-helpers';

/**
 * Card lookup proxy for the YDK deck viewer.
 *
 * The browser used to call db.ygoprodeck.com directly, which the CSP blocks in
 * production. Keeping the request on the server lets the CSP stay strict and
 * keeps the upstream URL out of the client bundle.
 */
const UPSTREAM = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const MAX_IDS = 50;

type UpstreamCard = {
	id: number;
	name?: string;
	type?: string;
	race?: string;
	attribute?: string;
	card_images?: Array<{ image_url: string; image_url_small: string }>;
};

export const GET: RequestHandler = async (event) => {
	requireUser(event);

	const ids = (event.url.searchParams.get('ids') ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter((id) => /^\d+$/.test(id))
		.slice(0, MAX_IDS);

	if (ids.length === 0) return json({ data: [] });

	try {
		const res = await fetch(`${UPSTREAM}?id=${ids.join(',')}`, {
			signal: AbortSignal.timeout(8000)
		});
		if (!res.ok) return json({ data: [] });

		const body = (await res.json()) as { data?: UpstreamCard[] };
		const cards = (body.data ?? []).map((card) => ({
			id: card.id,
			name: card.name,
			type: card.type,
			race: card.race,
			attribute: card.attribute,
			card_images: card.card_images
		}));

		return json({ data: cards }, { headers: { 'Cache-Control': 'private, max-age=86400' } });
	} catch {
		// Upstream being slow or down should not break the deck view.
		return json({ data: [] });
	}
};
