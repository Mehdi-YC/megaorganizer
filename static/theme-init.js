// Theme bootstrap. Must run before first paint, and before the app bundle
// hydrates: it applies the stored (or system) theme to <html> so the page
// never flashes the wrong background.
//
// Lives in /static rather than inline in app.html because the production CSP
// is nonce-based and SvelteKit only stamps a nonce on scripts it injects: an
// inline script here is blocked outright, which left the document on the
// light palette until the bundle loaded.
(function () {
	try {
		var theme = localStorage.getItem('theme') || 'system';
		var isDark =
			theme === 'dark' ||
			(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		var root = document.documentElement;
		if (isDark) {
			root.classList.add('dark');
			root.style.colorScheme = 'dark';
		} else {
			root.classList.remove('dark');
			root.style.colorScheme = 'light';
		}
	} catch (_) {
		// localStorage can be unavailable (private mode, blocked cookies):
		// the app then follows the system preference once it hydrates.
	}
})();
