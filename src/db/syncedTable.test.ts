import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { CourseDb, db } from './db';
import { journalRepo } from './journalRepo';
import { simRepo } from './simRepo';
import { newUid, withSyncFields } from './syncedTable';

const sim = (at: number): SimTrade => ({
  at,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 500,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 10_000,
  qty: 20,
  exitPrice: 110,
  exitIndex: 510,
  outcome: 'tp',
  pnl: 200,
  r: 2,
  fees: 2.3,
});

const journal = (openedAt: number): JournalTrade => ({
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(async () => {
  await db.simTrades.clear();
  await db.journal.clear();
  await db.outbox.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('synced records', () => {
  it('give new records a uid, a change time and an outbox entry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000);
    const id = await simRepo.add({ ...sim(1), uid: 'forged', deleted: true });
    const row = await db.simTrades.get(id);
    expect(row?.uid).toMatch(UUID);
    expect(row?.updatedAt).toBe(5_000);
    expect(row?.deleted).toBeUndefined();
    expect(await db.outbox.toArray()).toEqual([{ kind: 'sim', uid: row?.uid, at: 5_000 }]);
  });

  it('keep one outbox entry per record and stamp updates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);
    const id = await journalRepo.add(journal(1));
    vi.setSystemTime(2_000);
    expect(await journalRepo.update(id, { notes: 'вышел по плану' })).toBe(true);
    const row = await db.journal.get(id);
    expect(row).toMatchObject({ notes: 'вышел по плану', updatedAt: 2_000 });
    expect(await db.outbox.toArray()).toEqual([{ kind: 'journal', uid: row?.uid, at: 2_000 }]);
  });

  it('hide deleted records but keep them for other devices', async () => {
    const keep = await simRepo.add(sim(1));
    const gone = await simRepo.add(sim(2));
    await simRepo.remove(gone);
    expect((await simRepo.list()).map((t) => t.id)).toEqual([keep]);
    expect(await simRepo.get(gone)).toBeUndefined();
    expect(await simRepo.count()).toBe(1);
    expect(await simRepo.update(gone, { notes: 'x' })).toBe(false);
    expect((await db.simTrades.get(gone))?.deleted).toBe(true);
  });

  it('clear soft-deletes every record and queues each deletion', async () => {
    await journalRepo.add(journal(1));
    await journalRepo.add(journal(2));
    await journalRepo.clear();
    expect(await journalRepo.list()).toEqual([]);
    expect(await db.journal.count()).toBe(2);
    expect((await db.outbox.toArray()).every((e) => e.kind === 'journal')).toBe(true);
    expect(await db.outbox.count()).toBe(2);
  });
});

describe('newUid', () => {
  it('makes v4 ids also without crypto.randomUUID (plain HTTP)', () => {
    const own = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, newUid));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(UUID);
    } finally {
      // Without an own property the prototype's real function shows through again.
      if (own) Object.defineProperty(crypto, 'randomUUID', own);
      else Reflect.deleteProperty(crypto, 'randomUUID');
    }
    expect(typeof crypto.randomUUID).toBe('function');
  });

  it('withSyncFields keeps existing values', () => {
    expect(withSyncFields({ uid: 'u', updatedAt: 3 }, 9)).toEqual({ uid: 'u', updatedAt: 3 });
    expect(withSyncFields({}, 9)).toMatchObject({ uid: expect.stringMatching(UUID), updatedAt: 9 });
  });
});

describe('schema v2 migration', () => {
  it('gives records saved by v1 a uid and a change time', async () => {
    const name = `tc-db-migration-${Date.now()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({
      simTrades: '++id, at, scenarioId, strategyTag',
      journal: '++id, openedAt, account, setup',
    });
    await v1.table('simTrades').add(sim(111));
    await v1.table('journal').add(journal(222));
    v1.close();

    const v2 = new CourseDb(name);
    const [trade] = await v2.simTrades.toArray();
    const [entry] = await v2.journal.toArray();
    expect(trade).toMatchObject({ at: 111, updatedAt: 111, uid: expect.stringMatching(UUID) });
    expect(entry).toMatchObject({
      openedAt: 222,
      updatedAt: 222,
      uid: expect.stringMatching(UUID),
    });
    expect(await v2.outbox.count()).toBe(0);
    v2.close();
    await Dexie.delete(name);
  });
});
