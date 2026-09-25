import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetSafeStorage,
  isStorageHealthy,
  onStorageHealthChange,
  safeStorage,
} from './safeStorage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  __resetSafeStorage();
});

describe('safeStorage', () => {
  it('reads and writes through localStorage', () => {
    safeStorage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(safeStorage.getItem('k')).toBe('v');
    safeStorage.removeItem('k');
    expect(safeStorage.getItem('k')).toBeNull();
    expect(isStorageHealthy()).toBe(true);
  });

  it('falls back to memory and reports when writing fails', () => {
    const listener = vi.fn();
    onStorageHealthChange(listener);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    expect(() => safeStorage.setItem('k', 'v')).not.toThrow();
    expect(isStorageHealthy()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
    expect(safeStorage.getItem('k')).toBe('v');
  });

  it('falls back to memory when reading throws', () => {
    safeStorage.setItem('k', 'v');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(safeStorage.getItem('k')).toBe('v');
    expect(isStorageHealthy()).toBe(false);
  });

  it('returns the newer in-memory value when the last write failed', () => {
    safeStorage.setItem('k', 'old');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    safeStorage.setItem('k', 'new');
    expect(localStorage.getItem('k')).toBe('old');
    expect(safeStorage.getItem('k')).toBe('new');
    spy.mockRestore();
    safeStorage.setItem('k', 'newest');
    expect(localStorage.getItem('k')).toBe('newest');
    expect(safeStorage.getItem('k')).toBe('newest');
  });

  it('recovers health after a successful write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('fail once');
    });
    safeStorage.setItem('a', '1');
    expect(isStorageHealthy()).toBe(false);
    spy.mockRestore();
    safeStorage.setItem('a', '2');
    expect(isStorageHealthy()).toBe(true);
  });

  it('unsubscribes listeners', () => {
    const listener = vi.fn();
    const off = onStorageHealthChange(listener);
    off();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('x');
    });
    safeStorage.setItem('k', 'v');
    expect(listener).not.toHaveBeenCalled();
  });
});
