// Runtime migration bootstrap for the production image.
//
// Runs the same logic as `drizzle-kit migrate` (drizzle-orm/libsql/migrator),
// but with two production hardening tweaks:
//
//  1. It heals stale `__drizzle_migrations.create_at` timestamps. A migration
//     journal row records the `when` timestamp baked into the journal at
//     generate time. If a database was migrated against an older journal and
//     the journal was later regenerated (identical SQL, new `when`,
//     unchanged hash), drizzle would treat the already-applied migration as
//     pending and re-run its CREATE TABLEs, failing with
//     `SQLITE_ERROR: table ... already exists` and exit code 1 - silently,
//     because drizzle-kit's progress spinner swallows the message.
//
//  2. It reports failures to stderr plainly, instead of hiding them behind a
//     spinner that only renders on a TTY.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const FOLDER = 'drizzle';
const TABLE = '__drizzle_migrations';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const journal = JSON.parse(readFileSync(`${FOLDER}/meta/_journal.json`, 'utf8'));
const migrations = journal.entries.map((entry) => {
	const query = readFileSync(`${FOLDER}/${entry.tag}.sql`, 'utf8');
	return {
		tag: entry.tag,
		when: entry.when,
		hash: createHash('sha256').update(query).digest('hex'),
		sql: query.split('--> statement-breakpoint')
	};
});

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client);

async function healStaleTimestamps() {
	await client.execute(
		`CREATE TABLE IF NOT EXISTS "${TABLE}" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at numeric
		)`
	);

	const rows = (
		await client.execute(`SELECT hash, created_at FROM "${TABLE}" ORDER BY created_at DESC LIMIT 1`)
	).rows;

	if (rows.length === 0) {
		// No migration tracked yet. If the schema already exists (e.g. the old
		// entrypoint used `db:push`), treat the initial migration as applied so
		// `migrate` does not re-run its CREATE TABLEs on a populated database.
		const userTable = await client.execute(
			`SELECT count(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'user'`
		);
		if (Number(userTable.rows[0].c) > 0) {
			const last = migrations[migrations.length - 1];
			await client.execute({
				sql: `INSERT INTO "${TABLE}" ("hash", "created_at") VALUES (?, ?)`,
				args: [last.hash, last.when]
			});
			console.warn(`heal: schema already present; marked "${last.tag}" as applied`);
		}
		return;
	}

	const last = rows[0];
	const match = migrations.find((m) => m.hash === last.hash);
	if (match && Number(last.created_at) !== match.when) {
		await client.execute({
			sql: `UPDATE "${TABLE}" SET created_at = ? WHERE hash = ?`,
			args: [match.when, last.hash]
		});
		console.warn(`heal: aligned "${match.tag}" timestamp with the migration journal`);
	}
}

try {
	await healStaleTimestamps();
	await migrate(db, { migrationsFolder: FOLDER, migrationsTable: TABLE });
	console.log('migrations applied successfully');
} catch (err) {
	console.error('migration failed:', err?.message ?? err);
	process.exit(1);
}
