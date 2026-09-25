import { describe, expect, it } from 'vitest';
import { clamp, parseNumber, roundToStep } from './parseNumber';

describe('parseNumber', () => {
  it.each([
    ['1234,5', 1234.5],
    ['1 234,5', 1234.5],
    [`1${String.fromCharCode(160)}234.5`, 1234.5],
    ['60000', 60000],
    ['0.01', 0.01],
    [',5', 0.5],
    ['5.', 5],
    ['-12', -12],
    ['−12,5', -12.5],
    ['+3', 3],
    ["1'000", 1000],
  ])('%j → %s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each(['', '   ', '-', '+', '.', 'abc', '1,2,3', '1.2.3', '12a', '--1', '1e5'])(
    '%j → null',
    (input) => {
      expect(parseNumber(input)).toBeNull();
    },
  );
});

describe('clamp', () => {
  it('limits to bounds and ignores missing ones', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
    expect(clamp(100)).toBe(100);
    expect(clamp(-5, undefined, 10)).toBe(-5);
  });
});

describe('roundToStep', () => {
  it('rounds to the step without float noise', () => {
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(roundToStep(0.0137, 0.001)).toBe(0.014);
    expect(roundToStep(60123.46, 0.5)).toBe(60123.5);
    expect(roundToStep(7, 5)).toBe(5);
  });
  it('returns the value for a non-positive step', () => {
    expect(roundToStep(1.234, 0)).toBe(1.234);
  });
});
