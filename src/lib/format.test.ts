import { describe, expect, it } from 'vitest';
import {
  decimalsForStep,
  formatDuration,
  formatNumber,
  formatPct,
  formatPrice,
  formatR,
  formatUsd,
  plural,
} from './format';

// Intl uses non-breaking spaces as group separators; normalize for readable assertions.
const n = (s: string) => s.replace(/\s/g, ' ');

describe('decimalsForStep', () => {
  it.each([
    [0.1, 1],
    [0.01, 2],
    [0.001, 3],
    [0.0000001, 7],
    [1, 0],
    [10, 0],
    [2.5, 1],
    [0.125, 3],
    [1.5e-7, 8],
    [0, 0],
    [-0.1, 0],
    [Number.NaN, 0],
  ])('step %s → %s decimals', (step, expected) => {
    expect(decimalsForStep(step)).toBe(expected);
  });
});

describe('formatNumber', () => {
  it('groups thousands and uses a comma decimal separator', () => {
    expect(n(formatNumber(1234567.891))).toBe('1 234 567,89');
  });
  it('respects min decimals', () => {
    expect(formatNumber(5, 2, { minDecimals: 2 })).toBe('5,00');
  });
  it('returns a dash for invalid input', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatUsd', () => {
  it('formats positive and negative amounts', () => {
    expect(n(formatUsd(1234.5))).toBe('$1 234,50');
    expect(formatUsd(-12.345)).toBe('−$12,35');
    expect(formatUsd(0)).toBe('$0,00');
  });
  it('supports custom decimals and invalid values', () => {
    expect(formatUsd(10, 0)).toBe('$10');
    expect(formatUsd(null)).toBe('—');
  });
});

describe('formatPct', () => {
  it('converts fractions to percent', () => {
    expect(formatPct(0.0123)).toBe('1,23%');
    expect(formatPct(-0.5, 0)).toBe('−50%');
  });
  it('adds a plus sign when signed', () => {
    expect(formatPct(0.1, 1, true)).toBe('+10%');
    expect(formatPct(0, 1, true)).toBe('0%');
  });
  it('returns a dash for invalid input', () => {
    expect(formatPct(Number.NaN)).toBe('—');
  });
});

describe('formatPrice', () => {
  it('uses decimals from the tick size', () => {
    expect(n(formatPrice(60123.4, 0.1))).toBe('60 123,4');
    expect(formatPrice(1.5, 0.001)).toBe('1,500');
    expect(n(formatPrice(60000))).toBe('60 000,00');
  });
  it('returns a dash for invalid input', () => {
    expect(formatPrice(undefined)).toBe('—');
  });
});

describe('negative zero', () => {
  it('drops the minus when the value rounds to zero', () => {
    expect(formatPct(-0.00001)).toBe('0%');
    expect(formatR(-0.001)).toBe('0R');
    expect(formatUsd(-0.001)).toBe('$0,00');
    expect(formatR(0.001)).toBe('0R');
  });
});

describe('formatR', () => {
  it('formats signed R multiples', () => {
    expect(formatR(1.5)).toBe('+1,5R');
    expect(formatR(-1)).toBe('−1R');
    expect(formatR(0)).toBe('0R');
    expect(formatR(Number.NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 с'],
    [45.9, '45 с'],
    [60, '1 мин'],
    [725, '12 мин'],
    [3600, '1 ч'],
    [3900, '1 ч 5 мин'],
  ])('%s seconds → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
  it('returns a dash for negative or invalid input', () => {
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(null)).toBe('—');
  });
});

describe('plural', () => {
  const forms = ['урок', 'урока', 'уроков'] as const;
  it.each([
    [1, 'урок'],
    [2, 'урока'],
    [4, 'урока'],
    [5, 'уроков'],
    [11, 'уроков'],
    [12, 'уроков'],
    [14, 'уроков'],
    [21, 'урок'],
    [22, 'урока'],
    [62, 'урока'],
    [100, 'уроков'],
    [111, 'уроков'],
    [0, 'уроков'],
    [-1, 'урок'],
  ])('%s → %s', (count, expected) => {
    expect(plural(count, forms)).toBe(expected);
  });
});
