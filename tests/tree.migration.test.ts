import { describe, test, expect } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

function statements(sql: string): string[] {
	return sql
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);
}

describe('tree relationship unique index migration', () => {
	test('collapses duplicate edges before creating the index', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'megaorganizer-migration-'));
		const client = createClient({ url: `file:${join(dir, 'migration.db')}` });

		const files = readdirSync('drizzle')
			.filter((f) => f.endsWith('.sql'))
			.sort();

		try {
			for (const file of files.filter((f) => f < '0006')) {
				for (const sql of statements(readFileSync(join('drizzle', file), 'utf8'))) {
					await client.execute(sql);
				}
			}

			await client.execute(
				"INSERT INTO user (id, name, email, email_verified) VALUES ('u1', 'U', 'u@example.com', 1)"
			);
			await client.execute(
				"INSERT INTO tree_element (id, user_id, type, name) VALUES ('p', 'u1', 'node', 'Parent'), ('c', 'u1', 'item', 'Child')"
			);
			for (let i = 0; i < 2; i++) {
				await client.execute(
					"INSERT INTO tree_relationship (id, parent_type, parent_id, child_type, child_id, position) VALUES (?, 'node', 'p', 'item', 'c', ?)",
					[`edge-${i}`, i]
				);
			}

			const migration = files.find((f) => f.startsWith('0006'));
			expect(migration).toBeDefined();
			for (const sql of statements(readFileSync(join('drizzle', migration!), 'utf8'))) {
				await client.execute(sql);
			}

			const rows = await client.execute(
				"SELECT COUNT(*) AS count FROM tree_relationship WHERE parent_id = 'p' AND child_id = 'c'"
			);
			expect(Number(rows.rows[0].count)).toBe(1);

			const index = await client.execute(
				"SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'treeRelationship_parent_child_unique'"
			);
			expect(index.rows).toHaveLength(1);
		} finally {
			client.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
