const CACHE_NAME = 'megorganize-v2';
const RUNTIME_CACHE = 'megorganize-runtime-v2';

// Assets to pre-cache on install
const PRECACHE_URLS = [
	'/',
	'/app/training',
	'/app/training/running',
	'/app/training/session/new'
];

// Install: pre-cache critical app shell
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
	);
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys.filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE).map((key) => caches.delete(key))
			)
		).then(() => self.clients.claim())
	);
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests and non-http(s) schemes (e.g. chrome-extension)
	if (request.method !== 'GET') return;
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

	// API calls: network-first (fall back to cache if offline)
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Cache successful API GET responses for offline fallback
					if (response.ok) {
						const cloned = response.clone();
						caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
					}
					return response;
				})
				.catch(() => caches.match(request))
		);
		return;
	}

	// Static assets (JS, CSS, images): cache-first
	if (url.pathname.startsWith('/_app/') || url.pathname.match(/\.(js|css|png|svg|woff2?)$/)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => {
					if (response.ok) {
						const cloned = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
					}
					return response;
				});
			})
		);
		return;
	}

	// Navigation requests: network-first, fall back to cache
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Only cache successful responses
					if (response.ok) {
						const cloned = response.clone();
						caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
					}
					return response;
				})
				.catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
		);
		return;
	}
});

// Keep the service worker alive during GPS tracking
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'PING') {
		event.source.postMessage({ type: 'PONG' });
	}
});
