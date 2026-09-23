import { mdsvex } from 'mdsvex';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		fs: {
			allow: ['/proc']
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Node adapter — outputs a self-contained Node server to build/
			// for the production Docker image.
			adapter: adapter(),
			// CSP with nonces: SvelteKit injects small inline bootstrap
			// scripts, so a hand-written script-src 'self' breaks hydration.
			// Nonce mode covers those while keeping everything else strict.
			// Applied in production only (vite dev needs inline/eval).
			csp: {
				mode: 'nonce',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'style-src': [
						'self',
						'unsafe-inline',
						'https://cdnjs.cloudflare.com',
						'https://unpkg.com'
					],
					'font-src': ['self', 'https://cdnjs.cloudflare.com'],
					'img-src': ['self', 'data:', 'blob:', 'https:'],
					'connect-src': ['self', 'ws:', 'wss:'],
					'frame-src': ['self', 'https://www.youtube.com', 'https://www.google.com']
				}
			},
			preprocess: [mdsvex({ extensions: ['.svx', '.md'] })],
			extensions: ['.svelte', '.svx', '.md'],
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	]
});
