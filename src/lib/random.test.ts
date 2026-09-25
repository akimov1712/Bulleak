import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, pick, randomInt, sample, shuffle } from './random';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is stable and unsigned', () => {
    expect(hashString('m03-l02')).toBe(hashString('m03-l02'));
    expect(hashString('a')).not.toBe(hashString('b'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });
});

describe('randomInt', () => {
  it('stays inside the inclusive range and hits both ends', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomInt(rng, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
  it('throws when max < min', () => {
    expect(() => randomInt(mulberry32(1), 5, 1)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('keeps all items, does not mutate input, and is deterministic', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out1 = shuffle(input, mulberry32(9));
    const out2 = shuffle(input, mulberry32(9));
    expect(out1).toEqual(out2);
    expect([...out1].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out1).not.toEqual(input);
  });
  it('handles empty and single-item arrays', () => {
    expect(shuffle([], mulberry32(1))).toEqual([]);
    expect(shuffle(['x'], mulberry32(1))).toEqual(['x']);
  });
});

describe('pick / sample', () => {
  it('pick returns undefined for empty input', () => {
    expect(pick([], mulberry32(1))).toBeUndefined();
    expect(['a', 'b']).toContain(pick(['a', 'b'], mulberry32(1)));
  });
  it('sample returns distinct items and clamps count', () => {
    const s = sample([1, 2, 3, 4, 5], 3, mulberry32(5));
    expect(new Set(s).size).toBe(3);
    expect(sample([1, 2], 10, mulberry32(5))).toHaveLength(2);
    expect(sample([1, 2], -1, mulberry32(5))).toEqual([]);
  });
});
