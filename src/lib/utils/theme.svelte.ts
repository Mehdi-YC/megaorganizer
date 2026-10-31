export type Theme = 'light' | 'dark' | 'system';

class ThemeState {
	theme = $state<Theme>('system');
	resolved = $state<'light' | 'dark'>('dark');

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = (localStorage.getItem('theme') as Theme) || 'system';
			this.theme = saved;
			this.applyTheme(saved);

			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
				if (this.theme === 'system') {
					this.resolved = e.matches ? 'dark' : 'light';
					this.updateDom(this.resolved);
				}
			});
		}
	}

	private updateDom(resolved: 'light' | 'dark') {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (resolved === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
		// Keeps native widgets, scrollbars, and form controls on the same
		// scheme as the app (matches static/theme-init.js).
		root.style.colorScheme = resolved;
	}

	private applyTheme(newTheme: Theme) {
		if (typeof window === 'undefined') return;
		if (newTheme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			this.resolved = prefersDark ? 'dark' : 'light';
		} else {
			this.resolved = newTheme;
		}
		this.updateDom(this.resolved);
	}

	setTheme(newTheme: Theme) {
		this.theme = newTheme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', newTheme);
		}
		this.applyTheme(newTheme);
	}

	toggle() {
		const next: Theme = this.resolved === 'dark' ? 'light' : 'dark';
		this.setTheme(next);
	}
}

export const themeState = new ThemeState();
