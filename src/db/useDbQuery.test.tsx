import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('useDbQuery without IndexedDB', () => {
  it('runs the query directly so the page gets a result instead of loading forever', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.resetModules();
    const { useDbQuery } = await import('./useDbQuery');
    const { result } = renderHook(() => useDbQuery(() => Promise.resolve('fallback'), []));
    await waitFor(() => expect(result.current).toBe('fallback'));
  });

  it('repositories fail fast with a readable DbError', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.resetModules();
    const { journalRepo } = await import('./journalRepo');
    await expect(journalRepo.list()).rejects.toThrow(/хранилище браузера недоступно/);
  });
});
