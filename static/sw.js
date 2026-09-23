const CACHE_NAME = 'megorganize-v4';
const RUNTIME_CACHE = 'megorganize-runtime-v4';

// Precache only unauthenticated URLs that always return 200. Auth-gated
// pages and redirects make cache.addAll reject, which aborts the whole
// service worker install.
const PRECACHE_URLS = [
	'/manifest.json',
	'/icons/icon-96.png',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/icons/icon-maskable-512.png'
];

function offlineResponse() {
	return new Response(
		'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline - MegaOrganize</title><style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6e6e6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}main{text-align:center;padding:2rem}h1{font-size:1.25rem}p{color:#9a9a9a}</style></head><body><main><h1>You are offline</h1><p>MegaOrganize reconnects as soon as you have a connection.</p></main></body></html>',
		{
			status: 503,
			statusText: 'Offline',
			headers: { 'Content-Type': 'text/html; charset=utf-8' }
		}
	);
}

// Cache successful same-origin responses only. Redirected responses (like
// the login redirect) must never be stored under the requested URL.
function cacheIfUsable(cacheName, request, response) {
	if (response.ok && !response.redirected && response.type === 'basic') {
		const cloned = response.clone();
		caches.open(cacheName).then((cache) => cache.put(request, cloned));
	}
	return response;
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting())
	);
});

// Delete every cache from previous versions so cached HTML and the hashed
// assets it references are always wiped together.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests, non-http(s) schemes, and cross-origin traffic.
	if (request.method !== 'GET') return;
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
	if (url.origin !== self.location.origin) return;

	// API calls: network-first (fall back to cache if offline)
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(request)
				.then((response) => cacheIfUsable(RUNTIME_CACHE, request, response))
				.catch(() => caches.match(request).then((cached) => cached ?? offlineResponse()))
		);
		return;
	}

	// Static assets (JS, CSS, images): cache-first
	if (url.pathname.startsWith('/_app/') || url.pathname.match(/\.(js|css|png|svg|woff2?)$/)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => cacheIfUsable(CACHE_NAME, request, response));
			})
		);
		return;
	}

	// Navigation requests: network-first, offline page as fallback
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => cacheIfUsable(RUNTIME_CACHE, request, response))
				.catch(() => caches.match(request).then((cached) => cached ?? offlineResponse()))
		);
	}
});

// Keep the service worker alive during GPS tracking
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'PING') {
		event.source.postMessage({ type: 'PONG' });
	}
});
