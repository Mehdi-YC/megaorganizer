// Browser-side Web Push helpers used by the settings UI and the notification prompt.

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export interface PushStatus {
	/** False when this browser has no service worker / PushManager. */
	supported: boolean;
	/** False when the server has no VAPID keys, so push can never be delivered. */
	configured: boolean;
	/** True when this device is already subscribed. */
	subscribed: boolean;
}

/** Current push capability and subscription state for this device. */
export async function getPushStatus(): Promise<PushStatus> {
	const supported = 'serviceWorker' in navigator && 'PushManager' in window;
	if (!supported) return { supported: false, configured: false, subscribed: false };
	try {
		const res = await fetch('/api/push');
		if (!res.ok) return { supported, configured: false, subscribed: false };
		const info = await res.json();
		return {
			supported,
			configured: !!info.configured,
			subscribed: !!info.subscribed
		};
	} catch {
		return { supported, configured: false, subscribed: false };
	}
}

/** Subscribe this device to push. Returns true when enabled. */
export async function enablePush(): Promise<boolean> {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
	if (Notification.permission !== 'granted') {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') return false;
	}

	const res = await fetch('/api/push');
	if (!res.ok) return false;
	const { configured, publicKey, subscribed } = await res.json();
	if (!configured || !publicKey) return false;
	if (subscribed) return true;

	try {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource
		});
		const json = subscription.toJSON();
		const save = await fetch('/api/push', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'subscribe',
				endpoint: json.endpoint,
				p256dh: json.keys?.p256dh,
				auth: json.keys?.auth
			})
		});
		return save.ok;
	} catch {
		// Subscription refused or the push service is unreachable.
		return false;
	}
}

/** Unsubscribe this device from push. */
export async function disablePush(): Promise<void> {
	const registration = await navigator.serviceWorker.getRegistration();
	const subscription = await registration?.pushManager.getSubscription();
	if (!subscription) return;
	await fetch('/api/push', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'unsubscribe', endpoint: subscription.endpoint })
	});
	await subscription.unsubscribe();
}
