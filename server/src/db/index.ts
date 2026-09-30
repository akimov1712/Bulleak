import { mkdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';
import { runMigrations, type SqlRunner } from './migrate';
import { schema } from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** PostgreSQL in production; PGlite (Postgres in WASM) locally and in tests. */
export type DatabaseTarget =
  | { kind: 'postgres'; url: string }
  /** No `dataDir` — in memory (tests). */
  | { kind: 'pglite'; dataDir?: string };

export interface Database {
  db: Db;
  /** Applies pending SQL migrations; returns their names. */
  migrate(): Promise<string[]>;
  close(): Promise<void>;
}

function pgliteRunner(client: PGlite): SqlRunner {
  return {
    exec: async (sql) => {
      await client.exec(sql);
    },
    query: async <T>(sql: string, params: unknown[] = []) =>
      (await client.query<T>(sql, params)).rows,
  };
}

function pgRunner(client: pg.PoolClient): SqlRunner {
  return {
    exec: async (sql) => {
      await client.query(sql);
    },
    query: async <T>(sql: string, params: unknown[] = []) =>
      (await client.query(sql, params)).rows as T[],
  };
}

export async function openDatabase(target: DatabaseTarget): Promise<Database> {
  if (target.kind === 'pglite') {
    // PGlite creates only the last directory of the path.
    if (target.dataDir) await mkdir(target.dataDir, { recursive: true });
    const client = await PGlite.create(target.dataDir);
    return {
      db: drizzlePglite({ client, schema }) as unknown as Db,
      migrate: () => runMigrations(pgliteRunner(client)),
      close: () => client.close(),
    };
  }
  const pool = new pg.Pool({ connectionString: target.url, max: 10 });
  return {
    db: drizzlePg({ client: pool, schema }) as unknown as Db,
    // Migrations need one connection: BEGIN/COMMIT must run on the same client.
    migrate: async () => {
      const client = await pool.connect();
      try {
        return await runMigrations(pgRunner(client));
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** Fresh in-memory database with all migrations applied (tests). */
export async function openTestDatabase(): Promise<Database> {
  const database = await openDatabase({ kind: 'pglite' });
  await database.migrate();
  return database;
}
