import webPush from 'web-push';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { pushSubscription } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export interface PushPayload {
	title: string;
	body?: string;
	tag?: string;
	url?: string;
	reminderId?: string;
}

export function pushConfigured(): boolean {
	return !!env.VAPID_PUBLIC_KEY && !!env.VAPID_PRIVATE_KEY;
}

export function vapidPublicKey(): string | null {
	return env.VAPID_PUBLIC_KEY ?? null;
}

let vapidReady = false;
function ensureVapid(): boolean {
	if (vapidReady) return true;
	if (!pushConfigured()) return false;
	webPush.setVapidDetails(
		env.VAPID_SUBJECT ?? 'mailto:admin@localhost',
		env.VAPID_PUBLIC_KEY as string,
		env.VAPID_PRIVATE_KEY as string
	);
	vapidReady = true;
	return true;
}

export async function subscribe(
	userId: string,
	sub: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
	// The endpoint is the stable device identity; a re-subscribe refreshes keys.
	await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint));
	await db.insert(pushSubscription).values({
		userId,
		endpoint: sub.endpoint,
		p256dh: sub.keys.p256dh,
		auth: sub.keys.auth
	});
}

export async function unsubscribe(userId: string, endpoint: string): Promise<void> {
	await db
		.delete(pushSubscription)
		.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

export async function isSubscribed(userId: string): Promise<boolean> {
	const row = await db
		.select({ id: pushSubscription.id })
		.from(pushSubscription)
		.where(eq(pushSubscription.userId, userId))
		.limit(1)
		.get();
	return !!row;
}

/** Send a push to every device of a user. Returns the number delivered. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
	if (!ensureVapid()) return 0;
	const subs = await db
		.select()
		.from(pushSubscription)
		.where(eq(pushSubscription.userId, userId))
		.all();

	let sent = 0;
	for (const sub of subs) {
		try {
			await webPush.sendNotification(
				{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
				JSON.stringify(payload)
			);
			sent++;
			await db
				.update(pushSubscription)
				.set({ lastUsedAt: new Date() })
				.where(eq(pushSubscription.id, sub.id));
		} catch (err) {
			// Dead subscriptions are pruned; anything else is retried next tick.
			const status = (err as { statusCode?: number }).statusCode;
			if (status === 404 || status === 410) {
				await db.delete(pushSubscription).where(eq(pushSubscription.id, sub.id));
			}
		}
	}
	return sent;
}
