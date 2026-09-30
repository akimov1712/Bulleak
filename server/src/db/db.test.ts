import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { openTestDatabase, type Database } from './index';
import { runMigrations } from './migrate';
import { emailTokens, sessions, users } from './schema';

let database: Database | undefined;
afterEach(async () => {
  await database?.close();
  database = undefined;
});

async function fresh() {
  database = await openTestDatabase();
  return database;
}

const newUser = { email: 'anna@example.com', passwordHash: 'hash', name: 'Анна' };

describe('migrations', () => {
  it('apply once on a clean database', async () => {
    const { migrate } = await fresh();
    expect(await migrate()).toEqual([]);
  });

  it('roll back a failing file and report its name', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bulleak-mig-'));
    await writeFile(join(dir, '0001_ok.sql'), 'CREATE TABLE a (id int);');
    await writeFile(join(dir, '0002_bad.sql'), 'CREATE TABLE b (id int); SELECT * FROM nope;');
    const client = await PGlite.create();
    const runner = {
      exec: async (q: string) => {
        await client.exec(q);
      },
      query: async <T>(q: string, p: unknown[] = []) => (await client.query<T>(q, p)).rows,
    };
    const url = pathToFileURL(`${dir}/`);
    await expect(runMigrations(runner, url)).rejects.toThrow(/0002_bad\.sql/);
    const tables = await runner.query<{ name: string }>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
    );
    expect(tables.map((t) => t.name)).toEqual(['a', 'schema_migrations']);
    await client.close();
  });
});

describe('schema', () => {
  it('writes and reads every column through the query schema', async () => {
    const { db } = await fresh();
    const [user] = await db.insert(users).values(newUser).returning();
    expect(user).toMatchObject({ ...newUser, emailVerifiedAt: null });
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user?.createdAt).toBeInstanceOf(Date);
    if (!user) return;

    const expiresAt = new Date(Date.now() + 60_000);
    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        refreshHash: 'r1',
        familyId: crypto.randomUUID(),
        userAgent: 'test',
        expiresAt,
      })
      .returning();
    expect(session).toMatchObject({ userId: user.id, revokedAt: null, userAgent: 'test' });
    expect(session?.expiresAt.getTime()).toBe(expiresAt.getTime());

    const [token] = await db
      .insert(emailTokens)
      .values({ tokenHash: 't1', userId: user.id, kind: 'verify', expiresAt })
      .returning();
    expect(token).toMatchObject({ kind: 'verify', usedAt: null });
  });

  it('keeps e-mail unique regardless of case', async () => {
    const { db } = await fresh();
    await db.insert(users).values(newUser);
    await expect(
      db.insert(users).values({ ...newUser, email: 'Anna@Example.com' }),
    ).rejects.toThrow();
  });

  it('removes sessions and tokens with the user', async () => {
    const { db } = await fresh();
    const [user] = await db.insert(users).values(newUser).returning();
    if (!user) throw new Error('no user');
    const expiresAt = new Date(Date.now() + 60_000);
    await db
      .insert(sessions)
      .values({ userId: user.id, refreshHash: 'r', familyId: user.id, expiresAt });
    await db
      .insert(emailTokens)
      .values({ tokenHash: 't', userId: user.id, kind: 'reset', expiresAt });
    await db.delete(users).where(eq(users.id, user.id));
    const count = async (table: typeof sessions | typeof emailTokens) =>
      (await db.select({ n: sql<number>`count(*)::int` }).from(table))[0]?.n;
    expect(await count(sessions)).toBe(0);
    expect(await count(emailTokens)).toBe(0);
  });

  it('accepts only known e-mail token kinds', async () => {
    const { db } = await fresh();
    const [user] = await db.insert(users).values(newUser).returning();
    if (!user) throw new Error('no user');
    await expect(
      db.execute(
        sql`INSERT INTO email_tokens (token_hash, user_id, kind, expires_at) VALUES ('x', ${user.id}, 'magic', now())`,
      ),
    ).rejects.toThrow();
  });
});
