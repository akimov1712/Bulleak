import { describe, expect, it, vi } from 'vitest';
import { createPromiseCache } from './promiseCache';

describe('createPromiseCache', () => {
  it('loads once per key and can forget a key', async () => {
    const cache = createPromiseCache<string, number>();
    const load = vi.fn(() => Promise.resolve(1));
    const a = cache.get('x', load);
    expect(cache.get('x', load)).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
    cache.get('y', load);
    expect(load).toHaveBeenCalledTimes(2);
    cache.forget('x');
    expect(cache.get('x', load)).not.toBe(a);
    await expect(a).resolves.toBe(1);
  });
});
