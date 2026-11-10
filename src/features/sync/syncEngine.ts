/**
 * Keeps this browser and the account in step (docs/04-features/accounts-backend.md, sections
 * 7 and 9). The site stays local-first: everything works offline, the engine only moves
 * changes when it can. Progress is merged (mergeProgress), settings — last write wins,
 * records — push the outbox, then pull everything after the cursor.
 */
import { create } from 'zustand';
import type { RecordKindName } from '@bulleak/shared';
import { ApiError, type ApiClient } from '@/api/client';
import { db } from '@/db/db';
import { onLocalRecordChange } from '@/db/syncedTable';
import { isJournalTrade, isSimTrade } from '@/lib/io/backup';
import { migrateProgress } from '@/lib/progress/migrate';
import { PROGRESS_VERSION } from '@/lib/progress/initial';
import { sanitizeSettings } from '@/lib/settings';
import { canonical, sameData } from '@/lib/sync/canonical';
import { mergeProgress } from '@/lib/sync/mergeProgress';
import { planRemoteChange, toChange } from '@/lib/sync/records';
import { selectProgressData, useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import type { ProgressState } from '@/types/progress';
import type { JournalTrade, SimTrade } from '@/types/trading';

export type SyncApi = Pick<
  ApiClient,
  'getProgress' | 'putProgress' | 'getSettings' | 'putSettings' | 'pullRecords' | 'pushRecords'
>;

/* ---------- status (profile menu) ---------- */

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export const useSyncStatus = create<{ state: SyncState; lastSyncAt: number | null }>()(() => ({
  state: 'idle',
  lastSyncAt: null,
}));

/* ---------- what the engine remembers per browser ---------- */

const META_KEY = 'tc-sync';

interface SyncMeta {
  userId: string;
  cursors: Record<RecordKindName, number>;
  /** Settings as last agreed with the server (canonical text). */
  settingsSynced: string | null;
  lastSyncAt: number | null;
}

const freshMeta = (userId: string): SyncMeta => ({
  userId,
  cursors: { sim: 0, journal: 0 },
  settingsSynced: null,
  lastSyncAt: null,
});

export function readMeta(userId: string): SyncMeta {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as Partial<SyncMeta> | null;
    // Another account on this browser: start its cursors from the beginning.
    if (!raw || raw.userId !== userId) return freshMeta(userId);
    return {
      ...freshMeta(userId),
      ...raw,
      cursors: { ...freshMeta(userId).cursors, ...raw.cursors },
    };
  } catch {
    return freshMeta(userId);
  }
}

function writeMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage blocked: the next sync starts from the beginning, which is safe, only slower.
  }
}

/* ---------- applying remote data without re-triggering a sync ---------- */

let applyingRemote = false;
function applyRemote(apply: () => void) {
  applyingRemote = true;
  try {
    apply();
  } finally {
    applyingRemote = false;
  }
}

const localProgress = (): ProgressState => selectProgressData(useProgress.getState());
const localSettings = () => sanitizeSettings(useSettings.getState());

/* ---------- one sync ---------- */

async function syncProgress(api: SyncApi) {
  let remote = await api.getProgress();
  // A conflict means another device wrote meanwhile: merge with that and try again.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const server = remote.state
      ? migrateProgress(remote.state, PROGRESS_VERSION, Date.now())
      : null;
    const merged = server ? mergeProgress(localProgress(), server) : localProgress();
    if (!server || !sameData(merged, remote.state)) {
      const saved = await api.putProgress(merged as unknown as Record<string, unknown>, remote.rev);
      if ('conflict' in saved) {
        remote = saved.conflict;
        continue;
      }
    }
    // Merge with what is local *now*: the learner may have earned XP while we were waiting.
    const now = localProgress();
    const result = mergeProgress(now, merged);
    if (!sameData(result, now)) applyRemote(() => useProgress.setState(result));
    if (!sameData(result, merged)) scheduleSoon();
    return;
  }
  throw new ApiError('conflict', 'Прогресс меняется на другом устройстве, попробуем позже.');
}

async function syncSettings(api: SyncApi, meta: SyncMeta) {
  const local = canonical(localSettings());
  if (meta.settingsSynced !== local) {
    // Changed here since the last sync (or never synced): this browser's choice wins.
    if (meta.settingsSynced === null) {
      const remote = await api.getSettings();
      if (remote.state) {
        const theirs = sanitizeSettings(remote.state);
        applyRemote(() => useSettings.setState(theirs));
        meta.settingsSynced = canonical(localSettings());
        return;
      }
    }
    await api.putSettings(localSettings());
    meta.settingsSynced = local;
    return;
  }
  const remote = await api.getSettings();
  if (!remote.state) return;
  const theirs = sanitizeSettings(remote.state);
  if (canonical(theirs) !== local) {
    applyRemote(() => useSettings.setState(theirs));
    meta.settingsSynced = canonical(localSettings());
  }
}

type AnyRow = (SimTrade | JournalTrade) & { id?: number };

interface RecordStore<T extends AnyRow> {
  byUid(uid: string): Promise<T | undefined>;
  add(row: T): Promise<unknown>;
  replace(id: number, row: T): Promise<unknown>;
  remove(id: number): Promise<unknown>;
  isRecord(value: unknown): value is T;
  /** Deleted rows whose deletion the server already has. */
  syncedTombstones(): Promise<number[]>;
}

function recordStore(kind: RecordKindName): RecordStore<AnyRow> {
  const pending = async () =>
    new Set((await db.outbox.filter((e) => e.kind === kind).toArray()).map((e) => e.uid));
  if (kind === 'sim') {
    return {
      byUid: (uid) => db.simTrades.where('uid').equals(uid).first(),
      add: (row) => db.simTrades.add(row as SimTrade),
      replace: (id, row) => db.simTrades.put({ ...(row as SimTrade), id }),
      remove: (id) => db.simTrades.delete(id),
      isRecord: (v): v is AnyRow => isSimTrade(v),
      syncedTombstones: async () => {
        const queued = await pending();
        return (await db.simTrades.filter((t) => t.deleted === true).toArray())
          .filter((t) => t.id !== undefined && !(t.uid && queued.has(t.uid)))
          .map((t) => t.id as number);
      },
    };
  }
  return {
    byUid: (uid) => db.journal.where('uid').equals(uid).first(),
    add: (row) => db.journal.add(row as JournalTrade),
    replace: (id, row) => db.journal.put({ ...(row as JournalTrade), id }),
    remove: (id) => db.journal.delete(id),
    isRecord: (v): v is AnyRow => isJournalTrade(v),
    syncedTombstones: async () => {
      const queued = await pending();
      return (await db.journal.filter((t) => t.deleted === true).toArray())
        .filter((t) => t.id !== undefined && !(t.uid && queued.has(t.uid)))
        .map((t) => t.id as number);
    },
  };
}

const PUSH_PAGE = 500;

async function pushRecords(api: SyncApi, kind: RecordKindName, store: RecordStore<AnyRow>) {
  const queued = await db.outbox.filter((e) => e.kind === kind).toArray();
  for (let i = 0; i < queued.length; i += PUSH_PAGE) {
    const entries = queued.slice(i, i + PUSH_PAGE);
    const changes = [];
    for (const entry of entries) {
      const row = await store.byUid(entry.uid);
      if (row?.uid) changes.push(toChange({ ...row, uid: row.uid }));
    }
    if (changes.length > 0) await api.pushRecords(kind, changes);
    // Drop only entries that did not change again while the request was in flight.
    await db.transaction('rw', db.outbox, async () => {
      for (const entry of entries) {
        const now = await db.outbox.get([entry.kind, entry.uid]);
        if (now && now.at === entry.at) await db.outbox.delete([entry.kind, entry.uid]);
      }
    });
  }
}

async function pullRecords(
  api: SyncApi,
  kind: RecordKindName,
  store: RecordStore<AnyRow>,
  meta: SyncMeta,
) {
  for (;;) {
    const page = await api.pullRecords(kind, meta.cursors[kind]);
    for (const change of page.changes) {
      const action = planRemoteChange(await store.byUid(change.uid), change, store.isRecord);
      if (action.type === 'add') await store.add(action.row);
      else if (action.type === 'update') await store.replace(action.id, action.row);
      else if (action.type === 'delete') await store.remove(action.id);
    }
    meta.cursors[kind] = page.cursor;
    writeMeta(meta);
    if (!page.more) return;
  }
}

async function syncRecords(api: SyncApi, meta: SyncMeta) {
  for (const kind of ['sim', 'journal'] as const) {
    const store = recordStore(kind);
    await pushRecords(api, kind, store);
    await pullRecords(api, kind, store, meta);
    for (const id of await store.syncedTombstones()) await store.remove(id);
  }
}

/** One full sync; throws ApiError on failure (network, server). */
/**
 * The first sync of an account in this browser takes along what was done here before signing
 * in (as a guest, or before records had sync fields): every live record goes to the outbox.
 * Progress needs nothing extra — it is merged with the account's anyway.
 */
async function queueLocalRecords() {
  await db.transaction('rw', db.simTrades, db.journal, db.outbox, async () => {
    const now = Date.now();
    const sims = await db.simTrades.filter((t) => !t.deleted && Boolean(t.uid)).toArray();
    const notes = await db.journal.filter((t) => !t.deleted && Boolean(t.uid)).toArray();
    await db.outbox.bulkPut([
      ...sims.map((t) => ({ kind: 'sim' as const, uid: t.uid ?? '', at: t.updatedAt ?? now })),
      ...notes.map((t) => ({ kind: 'journal' as const, uid: t.uid ?? '', at: t.updatedAt ?? now })),
    ]);
  });
}

export async function syncOnce(api: SyncApi, userId: string): Promise<void> {
  const meta = readMeta(userId);
  if (meta.lastSyncAt === null) await queueLocalRecords();
  await syncProgress(api);
  await syncSettings(api, meta);
  await syncRecords(api, meta);
  meta.lastSyncAt = Date.now();
  writeMeta(meta);
}

/* ---------- when to sync ---------- */

const DEBOUNCE_MS = 3_000;
const INTERVAL_MS = 60_000;

let scheduleSoon: () => void = () => undefined;

/**
 * Runs sync for the signed-in user: right away, 3 s after a local change, on return to the
 * tab, when the network comes back and every minute while the tab is visible.
 * Returns the stop function.
 */
export function startSyncEngine(api: SyncApi, userId: string): () => void {
  let stopped = false;
  let running = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function run() {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    useSyncStatus.setState({ state: 'syncing' });
    try {
      await syncOnce(api, userId);
      useSyncStatus.setState({ state: 'synced', lastSyncAt: Date.now() });
    } catch (error) {
      const offline = error instanceof ApiError && error.code === 'network';
      useSyncStatus.setState({ state: offline ? 'offline' : 'error' });
    } finally {
      running = false;
      if (again && !stopped) {
        again = false;
        schedule(0);
      }
    }
  }

  function schedule(delay: number) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), delay);
  }

  scheduleSoon = () => schedule(DEBOUNCE_MS);
  const onChange = () => {
    if (!applyingRemote) schedule(DEBOUNCE_MS);
  };
  const unsubProgress = useProgress.subscribe(onChange);
  const unsubSettings = useSettings.subscribe(onChange);
  const unsubRecords = onLocalRecordChange(onChange);
  const onVisible = () => {
    if (document.visibilityState === 'visible') schedule(0);
  };
  const onOnline = () => schedule(0);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') void run();
  }, INTERVAL_MS);

  schedule(0);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    unsubProgress();
    unsubSettings();
    unsubRecords();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    scheduleSoon = () => undefined;
    useSyncStatus.setState({ state: 'idle' });
  };
}
