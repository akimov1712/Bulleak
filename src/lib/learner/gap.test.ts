import { describe, expect, it } from 'vitest';
import type { SimTrade } from '@/types/trading';
import type { QuizAttempt } from '@/types/progress';
import { betaCdf, lnGamma } from './beta';
import { gapProbability, skillState } from './gap';
import type { SkillKnowledge } from './knowledge';
import type { SkillBehaviour } from './behaviour';
import { learnerModel } from './model';
import { answerEvents } from './events';

describe('betaCdf', () => {
  it('matches closed forms', () => {
    for (const x of [0.05, 0.3, 0.5, 0.77, 0.99]) {
      expect(betaCdf(x, 1, 1)).toBeCloseTo(x, 10);
      expect(betaCdf(x, 2, 1)).toBeCloseTo(x * x, 10);
      expect(betaCdf(x, 1, 2)).toBeCloseTo(1 - (1 - x) ** 2, 10);
      expect(betaCdf(x, 0.5, 0.5)).toBeCloseTo((2 / Math.PI) * Math.asin(Math.sqrt(x)), 10);
    }
    // I_0.4(2, 3) = Σ_{j=2..4} C(4, j) 0.4^j 0.6^(4−j)
    expect(betaCdf(0.4, 2, 3)).toBeCloseTo(0.5248, 10);
    expect(betaCdf(0.3, 20.5, 7.25) + betaCdf(0.7, 7.25, 20.5)).toBeCloseTo(1, 10);
  });

  it('handles the edges', () => {
    expect(betaCdf(0, 2, 2)).toBe(0);
    expect(betaCdf(-1, 2, 2)).toBe(0);
    expect(betaCdf(1, 2, 2)).toBe(1);
    expect(betaCdf(0.5, 0, 2)).toBeNaN();
  });

  it('lnGamma matches factorials', () => {
    expect(lnGamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
  });
});

const k = (p: number, mastered = false): SkillKnowledge => ({
  skill: 's',
  p,
  pAtLast: p,
  answers: 5,
  correct: 4,
  lastAt: 0,
  mastered,
});
const b = (kept: number, broken: number): SkillBehaviour => ({
  skill: 's',
  rule: 'risk',
  alpha: 1 + kept,
  beta: 1 + broken,
  b: (1 + kept) / (2 + kept + broken),
  trades: kept + broken,
  kept,
  lastAt: 0,
});

describe('gapProbability', () => {
  it('grows with evidence of broken rules', () => {
    expect(gapProbability(0.9, b(0, 1))).toBeLessThan(gapProbability(0.9, b(0, 8)));
    // Beta(9, 1): P(B < 0.7) = 0.7^9
    expect(gapProbability(0.9, b(8, 0))).toBeCloseTo(0.7 ** 9, 10);
    expect(gapProbability(0.9, b(0, 8))).toBeGreaterThan(0.9);
  });
});

describe('skillState', () => {
  it('classifies the deficit', () => {
    expect(skillState('s', undefined, b(0, 8), true).deficit).toBe('new');
    expect(skillState('s', k(0.4), undefined, false).deficit).toBe('knowledge');
    expect(skillState('s', k(0.9, true), b(0, 8), true)).toMatchObject({
      deficit: 'behaviour',
      significantGap: true,
    });
    // One broken trade is not enough evidence of a gap.
    expect(skillState('s', k(0.9, true), b(0, 1), true)).toMatchObject({
      deficit: 'mastered',
      significantGap: false,
    });
    expect(skillState('s', k(0.9, true), undefined, true).deficit).toBe('practice');
    // Trades exist, but a conditional rule (after a loss) never applied: not «no practice».
    expect(skillState('s', k(0.9, true), undefined, true, true).deficit).toBe('mastered');
    expect(skillState('s', k(0.7), undefined, false).deficit).toBe('learning');
    expect(skillState('s', k(0.9, true), undefined, false).deficit).toBe('mastered');
    const s = skillState('s', k(0.9, true), b(8, 0), true);
    expect(s.gap).toBeCloseTo(0.9 - 0.9, 10);
    expect(s.deficit).toBe('mastered');
  });
});

describe('learnerModel', () => {
  it('finds the «knows, but does not do» skill from attempts and trades', () => {
    const answers = Array.from({ length: 6 }, (_, i) => ({
      q: `q${i}`,
      ok: true,
      tags: ['risk-per-trade'],
      type: 'single' as const,
    }));
    const attempts: QuizAttempt[] = [
      { quizId: 'm09-l01', at: 1, ratio: 1, passed: true, tags: {}, answers },
    ];
    const trade = (at: number): SimTrade => ({
      at,
      scenarioId: null,
      dataset: 'BTCUSDT-240',
      startIndex: 0,
      side: 'long',
      entry: 100,
      sl: 95,
      tp: 110,
      riskPct: 3,
      balanceBefore: 1000,
      qty: 6,
      exitPrice: 110,
      exitIndex: 5,
      outcome: 'tp',
      pnl: 60,
      r: 2,
      fees: 0,
    });
    const model = learnerModel({
      answers: answerEvents(attempts, (tags) => tags.filter((t) => t === 'risk-per-trade')),
      trades: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => trade(10 + i)),
      skills: ['risk-per-trade', 'expectancy', 'candles'],
      now: 100,
    });
    expect(model.map((s) => [s.skill, s.deficit])).toEqual([
      ['risk-per-trade', 'behaviour'],
      ['expectancy', 'new'],
      ['candles', 'new'],
    ]);
  });
});
