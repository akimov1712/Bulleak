import { and, count, eq, gt, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  jsonBytes,
  PROGRESS_MAX_BYTES,
  progressPutSchema,
  RECORD_MAX_BYTES,
  recordKindSchema,
  RECORDS_MAX_PER_KIND,
  RECORDS_PAGE,
  recordsPushSchema,
  SETTINGS_MAX_BYTES,
  settingsPutSchema,
  type ProgressDoc,
  type RecordsPage,
  type SettingsDoc,
} from '@bulleak/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { progress, settings, syncRecords, users } from '../db/schema';
import { payloadTooLarge, validation } from '../errors';
import { parseBody, type AuthedEnv } from '../http';
import { requireAuth } from '../auth/routes';

export interface SyncDeps {
  config: Config;
  db: Db;
}

/** /sync/* — the signed-in user's own data only; every query is scoped by user id. */
export function syncRoutes({ config, db }: SyncDeps) {
  const app = new Hono<AuthedEnv>();
  app.use('/sync/*', requireAuth(config.jwtSecret));
  app.use('/sync/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.get('/sync/progress', async (c) => {
    const [row] = await db
      .select({ state: progress.state, rev: progress.rev })
      .from(progress)
      .where(eq(progress.userId, c.get('userId')));
    const doc: ProgressDoc = row ? { state: row.state, rev: row.rev } : { state: null, rev: 0 };
    return c.json(doc);
  });

  /**
   * Saves the progress only if nobody changed it since `baseRev`; otherwise 409 with what the
   * server has, the client merges (mergeProgress) and tries again.
   */
  app.put('/sync/progress', async (c) => {
    const { state, baseRev } = await parseBody(c, progressPutSchema);
    if (jsonBytes(state) > PROGRESS_MAX_BYTES) throw payloadTooLarge();
    const userId = c.get('userId');
    const schemaVersion = typeof state.version === 'number' ? state.version : 0;
    const now = new Date();
    const saved =
      baseRev === 0
        ? await db
            .insert(progress)
            .values({ userId, state, schemaVersion, rev: 1, updatedAt: now })
            .onConflictDoNothing()
            .returning({ rev: progress.rev })
        : await db
            .update(progress)
            .set({ state, schemaVersion, rev: baseRev + 1, updatedAt: now })
            .where(and(eq(progress.userId, userId), eq(progress.rev, baseRev)))
            .returning({ rev: progress.rev });
    if (saved[0]) return c.json({ rev: saved[0].rev });
    const [current] = await db
      .select({ state: progress.state, rev: progress.rev })
      .from(progress)
      .where(eq(progress.userId, userId));
    const doc: ProgressDoc = current
      ? { state: current.state, rev: current.rev }
      : { state: null, rev: 0 };
    return c.json(doc, 409);
  });

  app.get('/sync/settings', async (c) => {
    const [row] = await db
      .select({ state: settings.state, rev: settings.rev })
      .from(settings)
      .where(eq(settings.userId, c.get('userId')));
    const doc: SettingsDoc = row ? { state: row.state, rev: row.rev } : { state: null, rev: 0 };
    return c.json(doc);
  });

  /** Settings: the last write wins. */
  app.put('/sync/settings', async (c) => {
    const { state } = await parseBody(c, settingsPutSchema);
    if (jsonBytes(state) > SETTINGS_MAX_BYTES) throw payloadTooLarge();
    const [row] = await db
      .insert(settings)
      .values({ userId: c.get('userId'), state, rev: 1 })
      .onConflictDoUpdate({
        target: settings.userId,
        set: { state, rev: sql`${settings.rev} + 1`, updatedAt: new Date() },
      })
      .returning({ rev: settings.rev });
    return c.json({ rev: row?.rev ?? 0 });
  });

  /** Changes after the cursor (deletions included), oldest first, a page at a time. */
  app.get('/sync/records', async (c) => {
    const kind = recordKindSchema.safeParse(c.req.query('kind'));
    const since = Number(c.req.query('since') ?? 0);
    if (!kind.success || !Number.isSafeInteger(since) || since < 0) {
      throw validation({ kind: 'Нужен kind=sim|journal и since — целое число' });
    }
    const rows = await db
      .select()
      .from(syncRecords)
      .where(
        and(
          eq(syncRecords.userId, c.get('userId')),
          eq(syncRecords.kind, kind.data),
          gt(syncRecords.rev, since),
        ),
      )
      .orderBy(syncRecords.rev)
      .limit(RECORDS_PAGE + 1);
    const page = rows.slice(0, RECORDS_PAGE);
    const body: RecordsPage = {
      changes: page.map((r) => ({
        uid: r.uid,
        updatedAt: r.changedAt,
        data: r.deleted ? null : r.data,
        rev: r.rev,
      })),
      cursor: page.at(-1)?.rev ?? since,
      more: rows.length > RECORDS_PAGE,
    };
    return c.json(body);
  });

  /** Upserts records; a change older than the stored one is ignored. */
  app.post('/sync/records', async (c) => {
    const { kind, changes } = await parseBody(c, recordsPushSchema);
    if (changes.some((ch) => ch.data !== null && jsonBytes(ch.data) > RECORD_MAX_BYTES)) {
      throw payloadTooLarge();
    }
    const userId = c.get('userId');
    const applied = await db.transaction(async (tx) => {
      // Lock the user's counter: concurrent pushes get distinct, increasing revs.
      const [counter] = await tx
        .select({ rev: users.recordRev })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      let rev = counter?.rev ?? 0;
      const mine = and(eq(syncRecords.userId, userId), eq(syncRecords.kind, kind));
      const uids = [...new Set(changes.map((ch) => ch.uid))];
      const existing = new Map(
        uids.length === 0
          ? []
          : (
              await tx
                .select({ uid: syncRecords.uid, changedAt: syncRecords.changedAt })
                .from(syncRecords)
                .where(and(mine, inArray(syncRecords.uid, uids)))
            ).map((r) => [r.uid, r.changedAt]),
      );
      const fresh = uids.filter((uid) => !existing.has(uid)).length;
      if (fresh > 0) {
        const [stored] = await tx.select({ n: count() }).from(syncRecords).where(mine);
        if ((stored?.n ?? 0) + fresh > RECORDS_MAX_PER_KIND) throw payloadTooLarge();
      }
      const kept: string[] = [];
      for (const change of changes) {
        const known = existing.get(change.uid);
        if (known !== undefined && known >= change.updatedAt) continue;
        rev += 1;
        const values = {
          data: change.data,
          changedAt: change.updatedAt,
          rev,
          deleted: change.data === null,
        };
        await tx
          .insert(syncRecords)
          .values({ userId, kind, uid: change.uid, ...values })
          .onConflictDoUpdate({
            target: [syncRecords.userId, syncRecords.kind, syncRecords.uid],
            set: values,
          });
        existing.set(change.uid, change.updatedAt);
        kept.push(change.uid);
      }
      await tx.update(users).set({ recordRev: rev }).where(eq(users.id, userId));
      return kept;
    });
    return c.json({ applied });
  });

  return app;
}
