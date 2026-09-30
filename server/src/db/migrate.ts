import { readdir, readFile } from 'node:fs/promises';

/** Minimal SQL access the migrator needs (PGlite and node-postgres both provide it). */
export interface SqlRunner {
  /** Runs one or more statements without parameters. */
  exec(sql: string): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

/**
 * Applies `NNNN_name.sql` files in order, each in its own transaction, recording them in
 * `schema_migrations`. Applied files must never change; add a new file instead.
 * Returns the names applied in this run.
 */
export async function runMigrations(runner: SqlRunner, dir: URL = MIGRATIONS_DIR) {
  await runner.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const done = new Set(
    (await runner.query<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name),
  );
  const files = (await readdir(dir)).filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f)).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, dir), 'utf8');
    await runner.exec('BEGIN');
    try {
      await runner.exec(sql);
      await runner.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await runner.exec('COMMIT');
    } catch (error) {
      await runner.exec('ROLLBACK');
      throw new Error(`Миграция ${file} не применилась: ${(error as Error).message}`, {
        cause: error,
      });
    }
    applied.push(file);
  }
  return applied;
}
