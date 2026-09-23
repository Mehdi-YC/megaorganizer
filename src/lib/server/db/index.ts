import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { ensureSearchIndex } from './search-index';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: env.DATABASE_URL });

// Enable foreign key enforcement (SQLite defaults to OFF)
await client.execute('PRAGMA foreign_keys = ON');

// Full-text search index: created, trigger-backed, and backfilled if empty.
// Skipped at build time, where this module graph is only evaluated.
if (!building) await ensureSearchIndex(client);

export const db = drizzle(client, { schema });

// Either the database handle or a transaction handle, so services can run
// inside db.transaction() without duplication.
export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
