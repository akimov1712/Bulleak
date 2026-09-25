import { describe, expect, it } from 'vitest';
import { slugify, textOf } from './slug';

describe('slugify', () => {
  it.each([
    ['Трейдинг простыми словами', 'трейдинг-простыми-словами'],
    ['Трейдинг, инвестиции и казино', 'трейдинг-инвестиции-и-казино'],
    ['Ёлка — R:R 1:2', 'елка-rr-12'],
    ['  Много   пробелов  ', 'много-пробелов'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('textOf', () => {
  it('flattens nested children', () => {
    expect(
      textOf(
        <>
          Что такое <strong>плечо</strong> и <em>маржа {2}</em>
        </>,
      ),
    ).toBe('Что такое плечо и маржа 2');
    expect(textOf(null)).toBe('');
  });
});
