import { describe, expect, it } from 'vitest';
import { isSimTrade } from '@/lib/io/backup';
import type { SimTrade } from '@/types/trading';
import { planRemoteChange, toChange } from './records';

const trade: SimTrade = {
  at: 1,
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
};
const UID = '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11';

describe('toChange', () => {
  it('sends the record without the local id and a deletion as null', () => {
    const change = toChange({ ...trade, id: 7, uid: UID, updatedAt: 50 });
    expect(change).toEqual({ uid: UID, updatedAt: 50, data: trade });
    expect(toChange({ ...trade, id: 7, uid: UID, updatedAt: 60, deleted: true })).toEqual({
      uid: UID,
      updatedAt: 60,
      data: null,
    });
  });
});

describe('planRemoteChange', () => {
  const change = (updatedAt: number, data: object | null) => ({
    uid: UID,
    updatedAt,
    data: data as Record<string, unknown> | null,
  });
  const local = { ...trade, id: 3, uid: UID, updatedAt: 10 };

  it('adds a new record and replaces an older local one, keeping the local id', () => {
    expect(planRemoteChange(undefined, change(5, { ...trade, id: 99 }), isSimTrade)).toEqual({
      type: 'add',
      row: { ...trade, uid: UID, updatedAt: 5 },
    });
    expect(planRemoteChange(local, change(20, { ...trade, pnl: 30 }), isSimTrade)).toEqual({
      type: 'update',
      id: 3,
      row: { ...trade, pnl: 30, uid: UID, updatedAt: 20 },
    });
  });

  it('skips changes that are not newer, including our own coming back', () => {
    expect(planRemoteChange(local, change(10, trade), isSimTrade)).toEqual({ type: 'skip' });
    expect(planRemoteChange(local, change(9, null), isSimTrade)).toEqual({ type: 'skip' });
  });

  it('deletes a local record and ignores deletions of unknown ones', () => {
    expect(planRemoteChange(local, change(11, null), isSimTrade)).toEqual({
      type: 'delete',
      id: 3,
    });
    expect(planRemoteChange(undefined, change(11, null), isSimTrade)).toEqual({ type: 'skip' });
  });

  it('ignores data that is not a record of this kind', () => {
    expect(planRemoteChange(undefined, change(5, { hello: 'world' }), isSimTrade)).toEqual({
      type: 'skip',
    });
  });
});
