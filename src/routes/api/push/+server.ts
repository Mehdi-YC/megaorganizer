import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api-helpers';
import { parseJson, validateBody, isNonEmptyString, isString } from '$lib/server/validate';
import {
	subscribe,
	unsubscribe,
	isSubscribed,
	vapidPublicKey,
	pushConfigured
} from '$lib/server/services/push.service';

// GET: push configuration and current subscription status.
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json({
		configured: pushConfigured(),
		publicKey: vapidPublicKey(),
		subscribed: await isSubscribed(user.id)
	});
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = await parseJson(event.request);
	const action = validateBody(body, { action: { validate: isNonEmptyString } });
	if (!action.ok) return action.error;

	switch (body.action) {
		case 'subscribe': {
			const v = validateBody(body, {
				endpoint: { validate: isNonEmptyString, label: 'Endpoint' },
				p256dh: { validate: isNonEmptyString, label: 'p256dh' },
				auth: { validate: isNonEmptyString, label: 'auth' }
			});
			if (!v.ok) return v.error;
			await subscribe(user.id, {
				endpoint: v.data.endpoint,
				keys: { p256dh: v.data.p256dh, auth: v.data.auth }
			});
			return json({ subscribed: true });
		}

		case 'unsubscribe': {
			const v = validateBody(body, {
				endpoint: { validate: isString, required: false, label: 'Endpoint' }
			});
			if (!v.ok) return v.error;
			if (v.data.endpoint) {
				await unsubscribe(user.id, v.data.endpoint);
			}
			return json({ subscribed: false });
		}

		default:
			return json({ error: 'Invalid action' }, { status: 400 });
	}
};
