import { describe, expect, it } from 'vitest';
import { disposition, overtrading, type HeldTrade } from './behaviour';

const DAY = 86_400_000;
const T0 = new Date(2026, 10, 2, 12).getTime();
const t = (day: number, held: number, r: number): HeldTrade => ({
  at: T0 + day * DAY,
  held,
  r,
  pnl: r * 10,
});

describe('disposition', () => {
  it('compares how long losers and winners are held', () => {
    const d = disposition([t(0, 10, 2), t(0, 20, 1), t(0, 45, -1), t(0, 0, 0)]);
    expect(d).toEqual({ ratio: 3, winners: 2, losers: 1 });
    expect(disposition([t(0, 10, 2)]).ratio).toBeNull();
  });
});

describe('overtrading', () => {
  it('needs five trading days', () => {
    expect(overtrading([0, 1, 2, 3].map((d) => t(d, 1, 1)))).toBeNull();
  });

  it('finds days busier than 90 % of the others and their result', () => {
    const calm = Array.from({ length: 9 }, (_, d) => t(d, 1, 1));
    const busy = Array.from({ length: 6 }, () => t(9, 1, -1));
    const o = overtrading([...calm, ...busy]);
    expect(o).toEqual({ days: 10, threshold: 1, busyDays: 1, busyAvgR: -1, otherAvgR: 1 });
  });
});
