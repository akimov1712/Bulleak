import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { db, DbError, dbErrorMessage } from './db';
import { simRepo } from './simRepo';
import { journalRepo } from './journalRepo';

const sim = (at: number, extra: Partial<SimTrade> = {}): SimTrade => ({
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
  ...extra,
});

const journal = (openedAt: number, extra: Partial<JournalTrade> = {}): JournalTrade => ({
  openedAt,
  account: 'testnet',
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
  ...extra,
});

beforeEach(async () => {
  await db.simTrades.clear();
  await db.journal.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simRepo', () => {
  it('adds with a fresh id and lists newest first', async () => {
    const a = await simRepo.add(sim(1));
    const b = await simRepo.add({ ...sim(3), id: a }); // an id on input never overwrites
    await simRepo.add(sim(2));
    expect(b).not.toBe(a);
    expect((await simRepo.list()).map((t) => t.at)).toEqual([3, 2, 1]);
    expect(await simRepo.count()).toBe(3);
    expect(await simRepo.get(a)).toMatchObject({ at: 1, outcome: 'tp' });
  });

  it('filters by scenario and strategy, and limits', async () => {
    await simRepo.add(sim(1, { scenarioId: 'm03-breakout' }));
    await simRepo.add(sim(2, { strategyTag: 'tps' }));
    await simRepo.add(sim(3, { scenarioId: 'm03-breakout' }));
    expect((await simRepo.list({ scenarioId: 'm03-breakout' })).map((t) => t.at)).toEqual([3, 1]);
    expect((await simRepo.list({ strategyTag: 'tps' })).map((t) => t.at)).toEqual([2]);
    expect((await simRepo.list({ limit: 1 })).map((t) => t.at)).toEqual([3]);
  });

  it('updates, removes, clears and replaces', async () => {
    const id = await simRepo.add(sim(1));
    expect(await simRepo.update(id, { notes: 'ретест' })).toBe(true);
    expect((await simRepo.get(id))?.notes).toBe('ретест');
    expect(await simRepo.update(9999, { notes: 'x' })).toBe(false);
    await simRepo.remove(id);
    expect(await simRepo.count()).toBe(0);
    await simRepo.add(sim(5));
    await simRepo.replaceAll([sim(7), sim(8)]);
    expect((await simRepo.list()).map((t) => t.at)).toEqual([8, 7]);
    await simRepo.clear();
    expect(await simRepo.count()).toBe(0);
  });

  it('turns storage failures into a readable DbError', async () => {
    const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    vi.spyOn(db.simTrades, 'add').mockRejectedValue(quota);
    const error = await simRepo.add(sim(1)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DbError);
    expect((error as DbError).message).toMatch(/закончилось место/);
    expect((error as DbError).cause).toBe(quota);
  });
});

describe('journalRepo', () => {
  it('stores, filters and updates journal records', async () => {
    const id = await journalRepo.add(journal(10));
    await journalRepo.add(journal(20, { account: 'real', setup: 'breakout' }));
    expect((await journalRepo.list()).map((t) => t.openedAt)).toEqual([20, 10]);
    expect(await journalRepo.list({ account: 'testnet' })).toHaveLength(1);
    expect(await journalRepo.list({ setup: 'breakout' })).toHaveLength(1);
    expect(await journalRepo.update(id, { exit: 61_000, closedAt: 30 })).toBe(true);
    expect(await journalRepo.get(id)).toMatchObject({ exit: 61_000, closedAt: 30 });
    await journalRepo.remove(id);
    expect(await journalRepo.count()).toBe(1);
    await journalRepo.replaceAll([journal(1)]);
    expect(await journalRepo.count()).toBe(1);
    await journalRepo.clear();
    expect(await journalRepo.count()).toBe(0);
  });
});

describe('dbErrorMessage', () => {
  it('explains quota and generic failures, also when wrapped by Dexie', () => {
    const wrapped = Object.assign(new Error('x'), {
      name: 'AbortError',
      inner: Object.assign(new Error('q'), { name: 'QuotaExceededError' }),
    });
    expect(dbErrorMessage('сохранить', wrapped)).toMatch(/закончилось место/);
    expect(dbErrorMessage('сохранить', new Error('x'))).toMatch(/^Не удалось сохранить: хранилище/);
    expect(dbErrorMessage('сохранить', 'weird')).toMatch(/недоступно/);
  });
});
