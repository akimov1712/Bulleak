import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  authResponseSchema,
  progressDocSchema,
  recordsPageSchema,
  RECORDS_PAGE,
  settingsDocSchema,
} from '@bulleak/shared';
import { API_PREFIX, createApp } from '../app';
import { loadConfig } from '../config';
import { openTestDatabase, type Database } from '../db';
import { users } from '../db/schema';
import { memoryLogger } from '../log';
import { memoryMailer } from '../mail';

let database: Database;
beforeAll(async () => {
  database = await openTestDatabase();
});
afterAll(() => database.close());
beforeEach(async () => {
  await database.db.delete(users);
});

const app = () =>
  createApp({
    config: loadConfig({ NODE_ENV: 'test', JWT_SECRET: 's'.repeat(40) }),
    logger: memoryLogger(),
    db: database.db,
    mailer: memoryMailer(),
  });

type App = ReturnType<typeof app>;

/** Registers a user and returns a request helper with their token. */
async function signedIn(a: App, email = `${randomUUID()}@mail.test`) {
  const res = await a.request(`${API_PREFIX}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'long pass phrase one', name: 'Тест' }),
  });
  const { accessToken } = authResponseSchema.parse(await res.json());
  return (path: string, init: { method?: string; body?: unknown } = {}) =>
    a.request(`${API_PREFIX}${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
}

describe('sync API', () => {
  it('needs a signed-in user', async () => {
    const res = await app().request(`${API_PREFIX}/sync/progress`);
    expect(res.status).toBe(401);
  });

  describe('progress', () => {
    it('starts empty, saves and refuses a stale base with 409 and the current state', async () => {
      const call = await signedIn(app());
      expect(progressDocSchema.parse(await (await call('/sync/progress')).json())).toEqual({
        state: null,
        rev: 0,
      });

      const first = await call('/sync/progress', {
        method: 'PUT',
        body: { state: { version: 3, xp: 10 }, baseRev: 0 },
      });
      expect(await first.json()).toEqual({ rev: 1 });
      const second = await call('/sync/progress', {
        method: 'PUT',
        body: { state: { version: 3, xp: 20 }, baseRev: 1 },
      });
      expect(await second.json()).toEqual({ rev: 2 });

      // A device that last saw rev 1 must merge first.
      const stale = await call('/sync/progress', {
        method: 'PUT',
        body: { state: { version: 3, xp: 15 }, baseRev: 1 },
      });
      expect(stale.status).toBe(409);
      expect(progressDocSchema.parse(await stale.json())).toEqual({
        state: { version: 3, xp: 20 },
        rev: 2,
      });
      // Two devices both creating the first document: the second one conflicts.
      const again = await call('/sync/progress', {
        method: 'PUT',
        body: { state: { xp: 1 }, baseRev: 0 },
      });
      expect(again.status).toBe(409);
    });

    it('refuses a document over the size limit', async () => {
      const call = await signedIn(app());
      const res = await call('/sync/progress', {
        method: 'PUT',
        body: { state: { blob: 'x'.repeat(1_100_000) }, baseRev: 0 },
      });
      expect(res.status).toBe(413);
    });
  });

  it('keeps the last written settings', async () => {
    const call = await signedIn(app());
    await call('/sync/settings', { method: 'PUT', body: { state: { theme: 'dark' } } });
    const res = await call('/sync/settings', {
      method: 'PUT',
      body: { state: { theme: 'light' } },
    });
    expect(await res.json()).toEqual({ rev: 2 });
    expect(settingsDocSchema.parse(await (await call('/sync/settings')).json())).toEqual({
      state: { theme: 'light' },
      rev: 2,
    });
  });

  describe('records', () => {
    const uid = () => randomUUID();

    it('pushes, pulls after a cursor, and passes deletions on', async () => {
      const call = await signedIn(app());
      const [a, b] = [uid(), uid()];
      await call('/sync/records', {
        method: 'POST',
        body: {
          kind: 'sim',
          changes: [
            { uid: a, updatedAt: 1, data: { at: 1 } },
            { uid: b, updatedAt: 1, data: { at: 2 } },
          ],
        },
      });
      const all = recordsPageSchema.parse(
        await (await call('/sync/records?kind=sim&since=0')).json(),
      );
      expect(all.changes.map((c) => c.uid)).toEqual([a, b]);
      expect(all.more).toBe(false);

      await call('/sync/records', {
        method: 'POST',
        body: { kind: 'sim', changes: [{ uid: a, updatedAt: 5, data: null }] },
      });
      const after = recordsPageSchema.parse(
        await (await call(`/sync/records?kind=sim&since=${all.cursor}`)).json(),
      );
      expect(after.changes).toEqual([{ uid: a, updatedAt: 5, data: null, rev: all.cursor + 1 }]);
      // Journal records are a separate list.
      const journal = recordsPageSchema.parse(
        await (await call('/sync/records?kind=journal&since=0')).json(),
      );
      expect(journal.changes).toEqual([]);
    });

    it('keeps the newer change of a record', async () => {
      const call = await signedIn(app());
      const id = uid();
      const push = (updatedAt: number, note: string) =>
        call('/sync/records', {
          method: 'POST',
          body: { kind: 'journal', changes: [{ uid: id, updatedAt, data: { note } }] },
        });
      expect(await (await push(10, 'новее')).json()).toEqual({ applied: [id] });
      expect(await (await push(5, 'старее')).json()).toEqual({ applied: [] });
      const page = recordsPageSchema.parse(
        await (await call('/sync/records?kind=journal&since=0')).json(),
      );
      expect(page.changes[0]?.data).toEqual({ note: 'новее' });
    });

    it('pages through many changes', async () => {
      const call = await signedIn(app());
      const changes = Array.from({ length: RECORDS_PAGE }, (_, i) => ({
        uid: uid(),
        updatedAt: i,
        data: { i },
      }));
      await call('/sync/records', { method: 'POST', body: { kind: 'sim', changes } });
      await call('/sync/records', {
        method: 'POST',
        body: { kind: 'sim', changes: [{ uid: uid(), updatedAt: 1, data: { i: -1 } }] },
      });
      const first = recordsPageSchema.parse(
        await (await call('/sync/records?kind=sim&since=0')).json(),
      );
      expect(first.changes).toHaveLength(RECORDS_PAGE);
      expect(first.more).toBe(true);
      const rest = recordsPageSchema.parse(
        await (await call(`/sync/records?kind=sim&since=${first.cursor}`)).json(),
      );
      expect(rest.changes).toHaveLength(1);
      expect(rest.more).toBe(false);
    });

    it('refuses bad input', async () => {
      const call = await signedIn(app());
      expect((await call('/sync/records?kind=other&since=0')).status).toBe(400);
      expect((await call('/sync/records?kind=sim&since=-1')).status).toBe(400);
      const tooMany = await call('/sync/records', {
        method: 'POST',
        body: {
          kind: 'sim',
          changes: Array.from({ length: RECORDS_PAGE + 1 }, () => ({
            uid: uid(),
            updatedAt: 1,
            data: {},
          })),
        },
      });
      expect(apiErrorSchema.parse(await tooMany.json()).error.code).toBe('validation');
      const huge = await call('/sync/records', {
        method: 'POST',
        body: {
          kind: 'sim',
          changes: [{ uid: uid(), updatedAt: 1, data: { x: 'y'.repeat(30_000) } }],
        },
      });
      expect(huge.status).toBe(413);
    });
  });

  it('never shows one user the data of another', async () => {
    const a = app();
    const alice = await signedIn(a);
    const bob = await signedIn(a);
    await alice('/sync/progress', { method: 'PUT', body: { state: { xp: 99 }, baseRev: 0 } });
    await alice('/sync/settings', { method: 'PUT', body: { state: { theme: 'dark' } } });
    const shared = randomUUID();
    await alice('/sync/records', {
      method: 'POST',
      body: { kind: 'sim', changes: [{ uid: shared, updatedAt: 1, data: { owner: 'alice' } }] },
    });
    // Bob's record with the same uid is his own, not an overwrite of Alice's.
    await bob('/sync/records', {
      method: 'POST',
      body: { kind: 'sim', changes: [{ uid: shared, updatedAt: 9, data: { owner: 'bob' } }] },
    });

    expect(await (await bob('/sync/progress')).json()).toEqual({ state: null, rev: 0 });
    expect(await (await bob('/sync/settings')).json()).toEqual({ state: null, rev: 0 });
    const alicePage = recordsPageSchema.parse(
      await (await alice('/sync/records?kind=sim&since=0')).json(),
    );
    expect(alicePage.changes.map((c) => c.data)).toEqual([{ owner: 'alice' }]);
  });
});
