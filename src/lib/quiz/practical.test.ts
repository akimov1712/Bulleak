import { describe, expect, it } from 'vitest';
import { gradePractical, practicalPassed } from './practical';

const longAnswer = { decision: 'long' as const, entry: 100, sl: 96, tp: 108, riskPct: 1 };

describe('gradePractical', () => {
  it('passes a long with the right direction, 1 % risk and R:R 2', () => {
    const g = gradePractical('long', longAnswer);
    expect(g).toMatchObject({ decisionOk: true, stopOk: true, takeOk: true, riskOk: true });
    expect(g.rr).toBe(2);
    expect(g.passed).toBe(true);
  });

  it('checks a short mirror-wise and accepts R:R exactly 1.5', () => {
    const g = gradePractical('short', {
      decision: 'short',
      entry: 100,
      sl: 104,
      tp: 94,
      riskPct: 0.5,
    });
    expect(g.rr).toBe(1.5);
    expect(g.passed).toBe(true);
  });

  it('fails on risk above 1 %, poor R:R or levels on the wrong side', () => {
    expect(gradePractical('long', { ...longAnswer, riskPct: 2 }).riskOk).toBe(false);
    expect(gradePractical('long', { ...longAnswer, riskPct: null }).passed).toBe(false);
    const tight = gradePractical('long', { ...longAnswer, tp: 105 });
    expect(tight.rr).toBe(1.25);
    expect(tight.rrOk).toBe(false);
    const wrongStop = gradePractical('long', { ...longAnswer, sl: 102 });
    expect(wrongStop.stopOk).toBe(false);
    expect(wrongStop.rr).toBeNull();
    expect(gradePractical('long', { ...longAnswer, tp: 99 }).takeOk).toBe(false);
    expect(gradePractical('long', { ...longAnswer, sl: null }).passed).toBe(false);
  });

  it('judges the decision, not the outcome: wrong direction fails, right skip passes', () => {
    expect(gradePractical('short', longAnswer).decisionOk).toBe(false);
    expect(gradePractical('short', longAnswer).passed).toBe(false);
    const skip = gradePractical('skip', {
      decision: 'skip',
      entry: 100,
      sl: null,
      tp: null,
      riskPct: null,
    });
    expect(skip.passed).toBe(true);
    expect(gradePractical('skip', longAnswer).passed).toBe(false);
    expect(gradePractical('long', { ...longAnswer, decision: 'skip' }).passed).toBe(false);
  });
});

describe('practicalPassed', () => {
  it('needs every scenario passed', () => {
    const ok = gradePractical('long', longAnswer);
    const bad = gradePractical('long', { ...longAnswer, riskPct: 3 });
    expect(practicalPassed([ok, ok, ok])).toBe(true);
    expect(practicalPassed([ok, bad, ok])).toBe(false);
    expect(practicalPassed([])).toBe(false);
  });
});
