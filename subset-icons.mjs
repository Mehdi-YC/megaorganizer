// Trims the Font Awesome webfonts to the glyphs the app uses.
//
// Font Awesome ships two large faces (158KB + 25KB) to draw about 145 icons.
// This script scans src/ for icon class names, resolves them to codepoints
// through the font's own CSS, and writes trimmed woff2 files to static/fonts/.
// layout.css declares those trimmed files as the app's Font Awesome faces (the
// full webfonts are not referenced at all).
//
// Run it whenever icons are added:  bun run icons:subset
// An icon that is missing from the trimmed files renders as an empty box, so
// the script lists any class it could not resolve.

import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const FA_CSS = 'node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css';
const FONTS = [
	{
		src: 'node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2',
		out: 'static/fonts/fa-solid-900.woff2'
	},
	{
		src: 'node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2',
		out: 'static/fonts/fa-regular-400.woff2'
	}
];

function* sourceFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sourceFiles(path);
		else if (/\.(svelte|ts)$/.test(entry.name)) yield path;
	}
}

// 1. Which icon classes does the codebase use?
const classUses = new Set();
for (const file of sourceFiles('src')) {
	const text = readFileSync(file, 'utf8');
	for (const match of text.matchAll(/\bfa-[a-z0-9-]+\b/g)) {
		// Font-size utilities look similar; icon names never do.
		if (/^fa-(xs|sm|lg|xl|2xs|2xl)$/.test(match[0])) continue;
		classUses.add(match[0]);
	}
}

// Stored icons are chosen from the pickers in src/, but a database that has
// been around a while can still hold older values. Fold them in when a local
// database is present, so no row ends up pointing at a trimmed glyph.
try {
	const { Database } = await import('bun:sqlite');
	const db = new Database(process.env.DATABASE_URL?.replace(/^file:/, '') || 'local.db', {
		readonly: true
	});
	let stored = 0;
	for (const table of ['category', 'page', 'reminder_template']) {
		try {
			for (const row of db
				.query(`select distinct icon from ${table} where icon is not null`)
				.all()) {
				for (const match of String(row.icon).matchAll(/\bfa-[a-z0-9-]+\b/g)) {
					classUses.add(match[0]);
					stored++;
				}
			}
		} catch {
			// Table not there (older schema); the source scan still covers it.
		}
	}
	db.close();
	if (stored) console.log(`stored icons folded in: ${stored}`);
} catch {
	// No local database (fresh checkout, or a remote one): the source scan is
	// still enough, since every icon the UI can store is listed in src/.
}

// 2. Icon class -> codepoint, straight from FontAwesome's own CSS.
const css = readFileSync(FA_CSS, 'utf8');
const codepoints = new Map();
for (const rule of css.matchAll(/\.([\w-]+(?:\s*,\s*\.[\w-]+)*)\{--fa:"\\([0-9a-f]+)"\}/g)) {
	for (const name of rule[1].split(',')) codepoints.set(name.replace('.', '').trim(), rule[2]);
}

// Utility classes (fa-solid, fa-spin, fa-fw ...) are styling, not glyphs.
const UTILITIES =
	/^fa-(solid|regular|brands|light|thin|duotone|font|spin|pulse|bounce|shake|flash|beat|fade|flip|rotate|spin-reverse|fw|xs|sm|lg|xl|2xs|2xl)$/;

const chars = new Set();
const unresolved = [];
for (const cls of classUses) {
	const code = codepoints.get(cls);
	if (code) {
		chars.add(String.fromCodePoint(parseInt(code, 16)));
	} else if (!UTILITIES.test(cls)) {
		unresolved.push(cls);
	}
}

// Class names built at runtime (fa-chevron-${dir}) show up here as their
// prefix. Take every icon that starts with such a name so the variants stay in.
const prefixResolved = [];
for (const cls of [...unresolved]) {
	const matches = [...codepoints.keys()].filter((name) => name.startsWith(cls + '-'));
	if (matches.length === 0) continue;
	for (const name of matches) chars.add(String.fromCodePoint(parseInt(codepoints.get(name), 16)));
	prefixResolved.push(`${cls} (${matches.length} variants)`);
	unresolved.splice(unresolved.indexOf(cls), 1);
}

const text = [...chars].join('');

console.log(`icon classes: ${classUses.size}, distinct glyphs: ${chars.size}`);
if (prefixResolved.length) console.log(`resolved by prefix: ${prefixResolved.join(', ')}`);
if (unresolved.length) console.log(`unresolved classes: ${unresolved.join(', ')}`);

mkdirSync('static/fonts', { recursive: true });
for (const { src, out } of FONTS) {
	const subset = await subsetFont(readFileSync(src), text, { targetFormat: 'woff2' });
	writeFileSync(out, subset);
	console.log(
		`${out}: ${(statSync(src).size / 1024).toFixed(0)}KB -> ${(subset.length / 1024).toFixed(0)}KB`
	);
}
