import { describe, expect, it } from 'vitest';
import { compound, realism } from './compounding';

describe('compound', () => {
  it('grows by the monthly factor', () => {
    const r = compound(1000, 2, 12);
    expect(r?.final).toBeCloseTo(1268.24, 2);
    expect(r?.balances).toHaveLength(13);
    expect(r?.totalPct).toBeCloseTo(26.82, 2);
    expect(r?.yearlyPct).toBeCloseTo(26.82, 2);
  });

  it('shows how absurd "10% a month" gets over 3 years', () => {
    expect(compound(1000, 10, 36)?.final).toBeCloseTo(30912.68, 1);
    expect(compound(1000, 100, 36)?.final).toBeGreaterThan(6e13);
  });

  it('works for losses too', () => {
    expect(compound(1000, -5, 12)?.final).toBeCloseTo(540.36, 2);
  });

  it('rejects invalid input', () => {
    expect(compound(0, 2, 12)).toBeNull();
    expect(compound(1000, -100, 12)).toBeNull();
    expect(compound(1000, 2, 0)).toBeNull();
    expect(compound(1000, 2, 1.5)).toBeNull();
    expect(compound(1000, Number.NaN, 12)).toBeNull();
  });
});

describe('realism', () => {
  it('grades monthly returns', () => {
    expect(realism(1)).toBe('realistic');
    expect(realism(3)).toBe('realistic');
    expect(realism(5)).toBe('ambitious');
    expect(realism(20)).toBe('unrealistic');
  });
});
