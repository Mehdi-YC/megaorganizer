// Test bootstrap, loaded via bunfig's `preload` before any test module.
//
// Two things have to happen here rather than in a test body:
//
//   1. `DATABASE_URL` must point at a scratch database before *any* service
//      module is imported. `src/lib/server/db/index.ts` reads
//      `env.DATABASE_URL` at module-evaluation time and throws if it is
//      missing, and creates the libsql client on that same line. Setting it
//      inside a test body would be too late: the import graph is hoisted.
//
//   2. The SvelteKit-only aliases (`$app/environment`, `$env/dynamic/private`)
//      do not resolve outside `vite`, so they are stubbed with `mock.module`
//      before the real modules are pulled in.
//
// The schema is applied by replaying `drizzle/*.sql`, the same files
// `migrate.mjs` feeds to the production migrator, so tests exercise the
// migrated schema rather than a hand-rolled approximation.
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'bun:test';
import { mock } from 'bun:test';
import { createClient } from '@libsql/client';

const scratchDir = mkdtempSync(join(tmpdir(), 'megaorganizer-test-'));
const dbPath = join(scratchDir, 'test.db');

process.env.DATABASE_URL = `file:${dbPath}`;
process.env.BETTER_AUTH_SECRET = 'test-secret-not-used-cryptographically';
process.env.ORIGIN = 'http://localhost:5173';

// Stub the SvelteKit virtual modules before anything imports them.
mock.module('$app/environment', () => ({
	building: false,
	browser: false,
	dev: true,
	version: 'test'
}));

mock.module('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		ORIGIN: process.env.ORIGIN
	}
}));

/** Split a drizzle SQL file into the individual statements it was generated from. */
function statements(file: string): string[] {
	return readFileSync(join('drizzle', file), 'utf8')
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);
}

async function applyMigrations() {
	const client = createClient({ url: process.env.DATABASE_URL! });
	const files = readdirSync('drizzle')
		.filter((f) => f.endsWith('.sql'))
		.sort();
	for (const file of files) {
		for (const sql of statements(file)) {
			await client.execute(sql);
		}
	}
	client.close();
}

await applyMigrations();

/**
 * Wipe every row from a set of tables without dropping the schema.
 * Used between tests that share the process-level database.
 */
export async function truncate(...tables: string[]) {
	const client = createClient({ url: process.env.DATABASE_URL! });
	for (const table of tables) {
		await client.execute(`DELETE FROM "${table}"`);
	}
	client.close();
}

afterAll(() => {
	rmSync(scratchDir, { recursive: true, force: true });
});
