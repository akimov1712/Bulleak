import { describe, expect, it } from 'vitest';
import { breakdown, curveStats } from './breakdown';

const res = (r: number) => ({ r, pnl: r * 10 });

describe('curveStats', () => {
  it('builds the R curve, the deepest fall and the longest streaks', () => {
    const s = curveStats([2, -1, -1, -1, 3, 1].map(res));
    expect(s.curveR).toEqual([0, 2, 1, 0, -1, 2, 3]);
    expect(s.maxDrawdownR).toBe(3);
    expect(s.longestLossStreak).toBe(3);
    expect(s.longestWinStreak).toBe(2);
    expect(curveStats([])).toEqual({
      curveR: [0],
      maxDrawdownR: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
    });
  });
});

describe('breakdown', () => {
  it('groups with count, winrate and average R, most trades first', () => {
    const items = [
      { ...res(2), side: 'long' },
      { ...res(-1), side: 'long' },
      { ...res(-1), side: 'short' },
      { ...res(1), side: 'long' },
    ];
    expect(breakdown(items, (t) => t.side)).toEqual([
      { label: 'long', count: 3, winrate: 2 / 3, avgR: 2 / 3, totalR: 2 },
      { label: 'short', count: 1, winrate: 0, avgR: -1, totalR: -1 },
    ]);
  });
});
