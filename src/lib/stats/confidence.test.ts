import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/random';
import { bootstrapMean, edgeVerdict } from './confidence';

const sample = (n: number, seed: number) => {
  const rng = mulberry32(seed);
  // Win 2R with 40 %, lose 1R otherwise: expectancy +0.2R.
  return Array.from({ length: n }, () => (rng() < 0.4 ? 2 : -1));
};

describe('bootstrapMean', () => {
  it('is deterministic and contains the mean', () => {
    const xs = sample(50, 3);
    const a = bootstrapMean(xs);
    expect(a).toEqual(bootstrapMean(xs));
    expect(a && a.low <= a.mean && a.mean <= a.high).toBe(true);
  });

  it('narrows as the sample grows', () => {
    const small = bootstrapMean(sample(20, 5));
    const large = bootstrapMean(sample(500, 5));
    expect(small && large && large.high - large.low < small.high - small.low).toBe(true);
  });

  it('needs at least two values; equal values give a point', () => {
    expect(bootstrapMean([1])).toBeNull();
    expect(bootstrapMean([1, 1, 1])).toEqual({ n: 3, mean: 1, low: 1, high: 1 });
  });
});

describe('edgeVerdict', () => {
  const ci = (n: number, low: number, high: number) => ({ n, mean: (low + high) / 2, low, high });

  it('says nothing under 30 trades and «unclear» when the interval crosses zero', () => {
    expect(edgeVerdict(null)).toBe('too-few');
    expect(edgeVerdict(ci(29, 0.5, 1))).toBe('too-few');
    expect(edgeVerdict(ci(30, -0.1, 0.5))).toBe('unclear');
    expect(edgeVerdict(ci(30, 0.1, 0.5))).toBe('positive');
    expect(edgeVerdict(ci(30, -0.5, -0.1))).toBe('negative');
  });
});
