import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, null, undefined, 'b', { c: true, d: false })).toBe('a b c');
  });

  it('lets the last conflicting tailwind class win', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-primary', 'bg-bear')).toBe('bg-bear');
  });

  it('returns an empty string for no input', () => {
    expect(cn()).toBe('');
  });
});
