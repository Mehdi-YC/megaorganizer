import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
			],
			'svelte/no-at-html-tags': 'off',

			// SvelteSet/SvelteDate only matter for a Set/Map/Date that is *held in
			// $state and mutated in place*, because that is the case the built-ins
			// cannot proxy. Every Set in this codebase follows copy-then-replace
			// (`const next = new Set(x); next.add(y); x = next`), which triggers
			// reactivity correctly, and the rule flags the local `new Set(...)`
			// temporaries regardless of how they are used. Converting those to
			// SvelteSet would add proxy overhead for no behavioural gain.
			//
			// The one genuine in-place mutation that slipped through, in the
			// category page's attachment list, is fixed in code. If a new one
			// appears the compiler will not catch it here, so the pattern to
			// avoid is: mutate a $state Set/Map and then self-assign it.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	}
);
