import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('keeps paths inside the site', () => {
    expect(safeNext('/lesson/m01-l02')).toBe('/lesson/m01-l02');
    expect(safeNext('/glossary?q=плечо')).toBe('/glossary?q=плечо');
  });

  it.each([
    null,
    '',
    'lesson',
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
    'javascript:alert(1)',
  ])('falls back to home for %s', (next) => {
    expect(safeNext(next)).toBe('/');
  });
});
