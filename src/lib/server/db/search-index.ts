import type { Client } from '@libsql/client';

// Full-text search index over every searchable domain. The index is a copy
// of the source rows maintained by SQL triggers (see buildDdl), so it can
// never drift from the source tables, including after backup imports.
//
// search_doc maps (entity_type, entity_id) to the FTS rowid so updates and
// deletes are O(log n) instead of scanning the index.

export interface SearchSource {
	/** Value stored in search_doc.entity_type and used in result shaping. */
	entityType: string;
	/** Physical table name. */
	table: string;
	/**
	 * SQL expressions evaluated against a source row. The `:row.` macro is
	 * replaced with a row reference (`NEW.`, `OLD.` or an alias), so the same
	 * expression drives triggers and bulk rebuilds.
	 */
	name: string;
	description: string | null;
	body: string | null;
}

export const SEARCH_SOURCES: SearchSource[] = [
	{
		entityType: 'page',
		table: 'page',
		name: ':row.name',
		description: ':row.description',
		body: ':row.markdown'
	},
	{
		entityType: 'tree_element',
		table: 'tree_element',
		name: ':row.name',
		description: ':row.description',
		body: ':row.markdown'
	},
	{
		entityType: 'reminder',
		table: 'reminder',
		name: ':row.title',
		description: ':row.description',
		body: ':row.markdown'
	},
	{
		entityType: 'reminder_template',
		table: 'reminder_template',
		name: ':row.title',
		description: ':row.description',
		body: ':row.markdown'
	},
	{
		entityType: 'expense',
		table: 'expense',
		name: "COALESCE(:row.description, '') || ' ' || :row.amount || ' ' || :row.currency",
		description: null,
		body: ':row.markdown'
	},
	{
		entityType: 'training_session',
		table: 'training_session',
		name: "COALESCE(:row.title, 'Training Session')",
		description: null,
		body: ':row.notes'
	},
	{
		entityType: 'tag',
		table: 'tag',
		name: ':row.name',
		description: null,
		body: null
	}
];

function render(expr: string | null, row: string): string {
	if (expr === null) return "''";
	return `COALESCE(${expr.split(':row.').join(row ? `${row}.` : '')}, '')`;
}

function deleteSql(source: SearchSource, row: 'OLD' | 'NEW'): string {
	const id = `${row}.id`;
	return `DELETE FROM search_index WHERE rowid IN (SELECT doc_id FROM search_doc WHERE entity_type = '${source.entityType}' AND entity_id = ${id});
	DELETE FROM search_doc WHERE entity_type = '${source.entityType}' AND entity_id = ${id};`;
}

function insertSql(source: SearchSource): string {
	return `INSERT INTO search_doc(entity_type, entity_id, user_id) VALUES ('${source.entityType}', NEW.id, NEW.user_id);
	INSERT INTO search_index(rowid, name, description, body) VALUES (last_insert_rowid(), ${render(source.name, 'NEW')}, ${render(source.description, 'NEW')}, ${render(source.body, 'NEW')});`;
}

export function buildDdl(): string[] {
	const ddl = [
		`CREATE TABLE IF NOT EXISTS search_doc (
			doc_id INTEGER PRIMARY KEY,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			UNIQUE(entity_type, entity_id)
		)`,
		`CREATE INDEX IF NOT EXISTS search_doc_user_idx ON search_doc(user_id)`,
		`CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
			name, description, body,
			tokenize = 'porter unicode61 remove_diacritics 2',
			prefix = '2 3'
		)`
	];
	for (const source of SEARCH_SOURCES) {
		ddl.push(
			`CREATE TRIGGER IF NOT EXISTS search_${source.table}_ai AFTER INSERT ON ${source.table} BEGIN
				${insertSql(source)}
			END`,
			`CREATE TRIGGER IF NOT EXISTS search_${source.table}_ad AFTER DELETE ON ${source.table} BEGIN
				${deleteSql(source, 'OLD')}
			END`,
			`CREATE TRIGGER IF NOT EXISTS search_${source.table}_au AFTER UPDATE ON ${source.table} BEGIN
				${deleteSql(source, 'OLD')}
				${insertSql(source)}
			END`
		);
	}
	return ddl;
}

/** Create the index structures and backfill them when empty. Idempotent. */
export async function ensureSearchIndex(client: Client): Promise<void> {
	for (const stmt of buildDdl()) {
		await client.execute(stmt);
	}
	const { rows } = await client.execute('SELECT COUNT(*) AS n FROM search_doc');
	if (Number(rows[0].n) === 0) {
		await rebuildSearchIndex(client);
	}
}

/** Drop and rebuild every document (or one user's documents) from source. */
export async function rebuildSearchIndex(client: Client, userId?: string): Promise<void> {
	const args = userId ? [userId] : [];
	if (userId) {
		await client.execute(
			`DELETE FROM search_index WHERE rowid IN (SELECT doc_id FROM search_doc WHERE user_id = ?)`,
			args
		);
		await client.execute('DELETE FROM search_doc WHERE user_id = ?', args);
	} else {
		await client.execute('DELETE FROM search_index');
		await client.execute('DELETE FROM search_doc');
	}
	for (const source of SEARCH_SOURCES) {
		const where = userId ? 'WHERE t.user_id = ?' : '';
		await client.execute(
			`INSERT INTO search_doc(entity_type, entity_id, user_id)
				SELECT '${source.entityType}', t.id, t.user_id FROM ${source.table} t ${where}`,
			args
		);
		await client.execute(
			`INSERT INTO search_index(rowid, name, description, body)
				SELECT d.doc_id, ${render(source.name, 't')}, ${render(source.description, 't')}, ${render(source.body, 't')}
				FROM ${source.table} t
				JOIN search_doc d ON d.entity_type = '${source.entityType}' AND d.entity_id = t.id
				${where}`,
			args
		);
	}
}

/**
 * Turn free text into a safe FTS5 MATCH expression. Every token becomes a
 * quoted prefix term, so search works as-you-type and input can never be
 * parsed as FTS query syntax.
 */
export function buildMatchQuery(input: string): string | null {
	const tokens = input
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
	if (tokens.length === 0) return null;
	return tokens.map((t) => `"${t}"*`).join(' ');
}
