import { describe, expect, it } from 'vitest';
import type { RuleCheck } from './rules';
import { disciplineSeries, disciplineSummary } from './disciplineIndex';

const ok = (rule: RuleCheck['rule']): RuleCheck => ({ rule, ok: true });
const bad = (rule: RuleCheck['rule']): RuleCheck => ({ rule, ok: false });

describe('disciplineSeries', () => {
  it('is the share of kept checks over a sliding window', () => {
    const checks = [[ok('risk'), bad('rr')], [ok('risk'), ok('rr')], [], [bad('risk')]];
    expect(disciplineSeries(checks, 2)).toEqual([50, 75, 100, 0]);
    expect(disciplineSeries([[]])).toEqual([null]);
  });
});

describe('disciplineSummary', () => {
  it('reports the current index, «few trades» and rules most broken first', () => {
    const checks = [
      [ok('risk'), bad('rr')],
      [bad('risk'), bad('rr')],
      [ok('risk'), ok('rr'), bad('revenge')],
    ];
    const s = disciplineSummary(checks);
    expect(s.trades).toBe(3);
    expect(s.fewTrades).toBe(true);
    expect(s.index).toBeCloseTo((3 / 7) * 100, 10);
    expect(s.rules.map((r) => [r.rule, r.broken, r.checked])).toEqual([
      ['revenge', 1, 1],
      ['rr', 2, 3],
      ['risk', 1, 3],
    ]);
  });

  it('has no index without trades', () => {
    expect(disciplineSummary([])).toMatchObject({ trades: 0, index: null, fewTrades: true });
  });

  it('counts only the window', () => {
    const checks = [[bad('risk')], ...Array.from({ length: 20 }, () => [ok('risk')])];
    expect(disciplineSummary(checks).index).toBe(100);
    expect(disciplineSummary(checks).fewTrades).toBe(false);
  });
});
