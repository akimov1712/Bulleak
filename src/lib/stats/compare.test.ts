import { describe, expect, it } from 'vitest';
import { divergences, sourceMetrics } from './compare';

const results = (rs: number[]) => rs.map((r) => ({ r, pnl: r * 10 }));
const many = (r: number, n: number) =>
  Array.from({ length: n }, (_, i) => r + (i % 2 ? 0.1 : -0.1));

describe('sourceMetrics', () => {
  it('counts trades, profit factor and the expectancy interval', () => {
    const m = sourceMetrics(results([2, -1, -1, 2]), 80);
    expect(m.trades).toBe(4);
    expect(m.profitFactor).toBe(2);
    expect(m.discipline).toBe(80);
    expect(m.expectancy?.mean).toBe(0.5);
    expect(sourceMetrics(results([1]), null).expectancy).toBeNull();
  });
});

describe('divergences', () => {
  it('flags a discipline gap of 20 points either way', () => {
    const sim = sourceMetrics(results([1, -1]), 95);
    expect(divergences(sim, sourceMetrics(results([1, -1]), 70))).toEqual([
      'discipline-lower-in-journal',
    ]);
    expect(divergences(sourceMetrics([], 60), sourceMetrics([], 85))).toEqual([
      'discipline-lower-in-sim',
    ]);
    expect(divergences(sim, sourceMetrics([], 80))).toEqual([]);
  });

  it('flags results only when the intervals do not overlap and both have 10 trades', () => {
    const good = sourceMetrics(results(many(1, 20)), null);
    const bad = sourceMetrics(results(many(-1, 20)), null);
    expect(divergences(good, bad)).toEqual(['results-differ']);
    expect(divergences(good, sourceMetrics(results(many(-1, 5)), null))).toEqual([]);
    expect(divergences(good, sourceMetrics(results(many(1, 20)), null))).toEqual([]);
  });
});
