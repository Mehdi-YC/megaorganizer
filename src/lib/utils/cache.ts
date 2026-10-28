/**
 * Drop anything this origin cached in the service worker. Called when the
 * login screen mounts, which covers both a fresh logout and a session that
 * expired while the app was closed.
 */
export async function clearAppCaches(): Promise<void> {
	if (typeof window === 'undefined' || !('caches' in window)) return;

	const keys = await caches.keys();
	await Promise.all(keys.map((key) => caches.delete(key)));
	navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHES' });
}
