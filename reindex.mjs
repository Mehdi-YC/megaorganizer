// Rebuild the full-text search index from the source tables.
// Usage: DATABASE_URL=file:local.db bun reindex.mjs
import { createClient } from '@libsql/client';
import { ensureSearchIndex, rebuildSearchIndex } from './src/lib/server/db/search-index.ts';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = createClient({ url });
await ensureSearchIndex(client);
await rebuildSearchIndex(client);

const { rows } = await client.execute('SELECT COUNT(*) AS n FROM search_doc');
console.log(`search index rebuilt: ${rows[0].n} documents`);
