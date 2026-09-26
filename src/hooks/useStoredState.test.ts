import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStoredState } from './useStoredState';

const isNumber = (v: unknown): v is number => typeof v === 'number';

beforeEach(() => localStorage.clear());

describe('useStoredState', () => {
  it('reads a valid stored value and ignores an invalid one', () => {
    localStorage.setItem('a', '5');
    localStorage.setItem('b', '"x"');
    expect(renderHook(() => useStoredState('a', 1, isNumber)).result.current[0]).toBe(5);
    expect(renderHook(() => useStoredState('b', 1, isNumber)).result.current[0]).toBe(1);
  });

  it('applies quick functional updates in order and persists the result', () => {
    const { result } = renderHook(() => useStoredState('n', 0, isNumber));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
      result.current[1](10 + 0);
      result.current[1]((n) => n * 2);
    });
    expect(result.current[0]).toBe(20);
    expect(localStorage.getItem('n')).toBe('20');
  });

  it('does not write the initial value until something changes', () => {
    renderHook(() => useStoredState('untouched', 3, isNumber));
    expect(localStorage.getItem('untouched')).toBeNull();
  });
});
