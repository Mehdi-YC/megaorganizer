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
		if (resolved === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
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
