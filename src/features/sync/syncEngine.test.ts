import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressDoc, RecordChange, RecordKindName, SettingsDoc } from '@bulleak/shared';
import { ApiError } from '@/api/client';
import { db } from '@/db/db';
import { simRepo } from '@/db/simRepo';
import { journalRepo } from '@/db/journalRepo';
import { selectProgressData, useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { applyImport, resetAll } from '@/features/settings/dataOps';
import { useAuth } from '@/store/authStore';
import { startSyncEngine, syncOnce, useSyncStatus, type SyncApi } from './syncEngine';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** In-memory server with the same rules as the real API (revs, 409, cursors, newer wins). */
function fakeServer() {
  let progress: ProgressDoc = { state: null, rev: 0 };
  let settings: SettingsDoc = { state: null, rev: 0 };
  let rev = 0;
  const records: Record<RecordKindName, Map<string, RecordChange & { rev: number }>> = {
    sim: new Map(),
    journal: new Map(),
  };
  /** Runs before the next progress write, as if another device wrote first. */
  let beforePut: (() => void) | null = null;
  let offline = false;
  const check = () => {
    if (offline) throw new ApiError('network', 'Нет связи');
  };

  const api: SyncApi = {
    getProgress: () => {
      check();
      return Promise.resolve(clone(progress));
    },
    putProgress: (state, baseRev) => {
      check();
      beforePut?.();
      beforePut = null;
      if (baseRev !== progress.rev) return Promise.resolve({ conflict: clone(progress) });
      progress = { state: clone(state), rev: baseRev + 1 };
      return Promise.resolve({ rev: progress.rev });
    },
    getSettings: () => {
      check();
      return Promise.resolve(clone(settings));
    },
    putSettings: (state) => {
      check();
      settings = { state: clone(state), rev: settings.rev + 1 };
      return Promise.resolve({ rev: settings.rev });
    },
    pullRecords: (kind, since) => {
      check();
      const changes = [...records[kind].values()]
        .filter((c) => c.rev > since)
        .sort((a, b) => a.rev - b.rev);
      return Promise.resolve({
        changes: clone(changes),
        cursor: changes.at(-1)?.rev ?? since,
        more: false,
      });
    },
    pushRecords: (kind, changes) => {
      check();
      const applied: string[] = [];
      for (const change of changes) {
        const known = records[kind].get(change.uid);
        if (known && known.updatedAt >= change.updatedAt) continue;
        rev += 1;
        records[kind].set(change.uid, { ...clone(change), rev });
        applied.push(change.uid);
      }
      return Promise.resolve({ applied });
    },
  };
  return {
    api,
    get progress() {
      return progress;
    },
    get settings() {
      return settings;
    },
    records,
    setProgress(doc: ProgressDoc) {
      progress = doc;
    },
    setSettings(doc: SettingsDoc) {
      settings = doc;
    },
    onNextProgressWrite(fn: () => void) {
      beforePut = fn;
    },
    setOffline(value: boolean) {
      offline = value;
    },
  };
}

const sim = (at: number): SimTrade => ({
  at,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 5,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 10_000,
  qty: 2,
  exitPrice: 110,
  exitIndex: 9,
  outcome: 'tp',
  pnl: 20,
  r: 2,
  fees: 0.1,
});

const note = (openedAt: number): JournalTrade => ({
  openedAt,
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 60_000,
  sl: 59_000,
  qty: 0.01,
  leverage: 3,
  fees: 0.7,
  setup: 'pullback',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
});

/** Another browser: empty local data and no sync memory, same account. */
async function switchDevice() {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
  await db.simTrades.clear();
  await db.journal.clear();
  await db.outbox.clear();
}

const USER = 'u-1';

beforeEach(switchDevice);

describe('syncOnce', () => {
  it('sends local progress, settings and records on the first sync', async () => {
    const server = fakeServer();
    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    useSettings.getState().update({ dailyGoalXp: 100 });
    await simRepo.add(sim(1));
    await journalRepo.add(note(2));

    await syncOnce(server.api, USER);

    expect(server.progress.rev).toBe(1);
    expect((server.progress.state as { xp: number }).xp).toBe(useProgress.getState().xp);
    expect(server.settings.state).toMatchObject({ dailyGoalXp: 100 });
    expect(server.records.sim.size).toBe(1);
    expect(server.records.journal.size).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it('brings everything to another device', async () => {
    const server = fakeServer();
    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    useSettings.getState().update({ dailyGoalXp: 150 });
    await simRepo.add(sim(1));
    await syncOnce(server.api, USER);
    const xp = useProgress.getState().xp;

    await switchDevice();
    await syncOnce(server.api, USER);

    expect(useProgress.getState().xp).toBe(xp);
    expect(useProgress.getState().lessons['m00-l01']?.readAt).toBeDefined();
    expect(useSettings.getState().dailyGoalXp).toBe(150);
    expect((await simRepo.list()).map((t) => t.at)).toEqual([1]);
    // Pulled records are not sent back.
    expect(await db.outbox.count()).toBe(0);
  });

  it('merges when another device wrote in between (409)', async () => {
    const server = fakeServer();
    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    await syncOnce(server.api, USER);
    const other = { ...clone(selectProgressData(useProgress.getState())), xp: 999 };
    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l02' });
    server.onNextProgressWrite(() =>
      server.setProgress({ state: other, rev: server.progress.rev + 1 }),
    );

    await syncOnce(server.api, USER);

    const state = server.progress.state as { xp: number; lessons: Record<string, unknown> };
    expect(state.xp).toBe(999);
    expect(Object.keys(state.lessons)).toEqual(expect.arrayContaining(['m00-l01', 'm00-l02']));
    expect(useProgress.getState().xp).toBe(999);
  });

  it('applies settings changed elsewhere and sends ones changed here', async () => {
    const server = fakeServer();
    await syncOnce(server.api, USER);
    server.setSettings({ state: { ...DEFAULT_SETTINGS, theme: 'light' }, rev: 5 });
    await syncOnce(server.api, USER);
    expect(useSettings.getState().theme).toBe('light');

    useSettings.getState().update({ sound: true });
    await syncOnce(server.api, USER);
    expect(server.settings.state).toMatchObject({ theme: 'light', sound: true });
  });

  it('passes deletions both ways and forgets synced tombstones', async () => {
    const server = fakeServer();
    const keep = await simRepo.add(sim(1));
    const drop = await simRepo.add(sim(2));
    await syncOnce(server.api, USER);

    await simRepo.remove(drop);
    await syncOnce(server.api, USER);
    expect([...server.records.sim.values()].filter((c) => c.data === null)).toHaveLength(1);
    expect(await db.simTrades.count()).toBe(1); // the tombstone is gone locally

    const uid = (await db.simTrades.get(keep))?.uid ?? '';
    await server.api.pushRecords('sim', [{ uid, updatedAt: Date.now() + 1000, data: null }]);
    await syncOnce(server.api, USER);
    expect(await simRepo.list()).toEqual([]);
  });

  it('keeps unsent changes when there is no connection', async () => {
    const server = fakeServer();
    await simRepo.add(sim(1));
    server.setOffline(true);
    await expect(syncOnce(server.api, USER)).rejects.toMatchObject({ code: 'network' });
    expect(await db.outbox.count()).toBe(1);
    server.setOffline(false);
    await syncOnce(server.api, USER);
    expect(await db.outbox.count()).toBe(0);
    expect(server.records.sim.size).toBe(1);
  });

  it('takes guest records made before sync fields existed into the account', async () => {
    const server = fakeServer();
    // Saved by an older version: a uid from the v2 migration, but no outbox entry.
    await db.simTrades.add({
      ...sim(1),
      uid: '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
      updatedAt: 1,
    });
    await db.journal.add({ ...note(2), uid: '1b2c3d4e-5f6a-4b7c-9d8e-1f2a3b4c5d6e', updatedAt: 2 });
    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    // The account already has progress from another device.
    server.setProgress({
      state: { ...clone(selectProgressData(useProgress.getState())), lessons: {}, xp: 300 },
      rev: 4,
    });

    await syncOnce(server.api, USER);

    expect(server.records.sim.size).toBe(1);
    expect(server.records.journal.size).toBe(1);
    const state = server.progress.state as { xp: number; lessons: Record<string, unknown> };
    expect(state.xp).toBe(300);
    expect(Object.keys(state.lessons)).toEqual(['m00-l01']);
    // Later syncs send only new changes.
    await syncOnce(server.api, USER);
    expect(await db.outbox.count()).toBe(0);
  });

  it('starts over for another account on the same browser', async () => {
    const server = fakeServer();
    await simRepo.add(sim(1));
    await syncOnce(server.api, USER);
    const other = fakeServer();
    await other.api.pushRecords('sim', [
      { uid: '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11', updatedAt: 1, data: { ...sim(7) } },
    ]);
    await syncOnce(other.api, 'u-2');
    expect((await simRepo.list()).map((t) => t.at).sort()).toEqual([1, 7]);
  });
});

describe('startSyncEngine', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs at once, after a change not sooner than every 30 s, and reports going offline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const server = fakeServer();
    const calls = vi.spyOn(server.api, 'getProgress');
    const stop = startSyncEngine(server.api, USER);

    // vi.waitFor moves the fake clock itself (fake IndexedDB also runs on timers).
    await vi.waitFor(() => expect(useSyncStatus.getState().state).toBe('synced'));
    expect(calls).toHaveBeenCalledTimes(1);

    useProgress.getState().dispatch({ type: 'lessonRead', lessonId: 'm00-l01' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(calls).toHaveBeenCalledTimes(2), { timeout: 15_000 });
    await vi.waitFor(() => expect(useSyncStatus.getState().state).toBe('synced'));

    server.setOffline(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(useSyncStatus.getState().state).toBe('offline'));

    stop();
    expect(useSyncStatus.getState().state).toBe('idle');
  });
});

describe('data operations while signed in', () => {
  it('sends records restored from a backup to the account', async () => {
    const server = fakeServer();
    await syncOnce(server.api, USER);
    await applyImport({
      progress: selectProgressData(useProgress.getState()),
      settings: {},
      simTrades: [sim(5)],
      journal: [note(6)],
      simBalance: undefined,
      preview: { simTrades: 1, journal: 1, skipped: 0, exportedAt: 0, lessonsCompleted: 0, xp: 0 },
    } as Parameters<typeof applyImport>[0]);
    await syncOnce(server.api, USER);
    expect(server.records.sim.size).toBe(1);
    expect(server.records.journal.size).toBe(1);
  });

  it('signs out before wiping, so nothing comes back from the account', async () => {
    const logout = vi.fn(() => Promise.resolve());
    useAuth.setState({
      api: { logout } as unknown as NonNullable<ReturnType<typeof useAuth.getState>['api']>,
      user: {
        id: USER,
        email: 'a@mail.test',
        name: 'А',
        emailVerified: true,
        createdAt: '2026-11-10T00:00:00.000Z',
      },
    });
    await resetAll();
    expect(logout).toHaveBeenCalledOnce();
    expect(useAuth.getState().user).toBeNull();
    useAuth.setState({ api: null });
  });
});
