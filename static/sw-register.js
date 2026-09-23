// Kept out of app.html so the page CSP can use script-src 'self' in
// production without 'unsafe-inline'.
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
	});
}
