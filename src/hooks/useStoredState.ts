import { useCallback, useState } from 'react';

/**
 * useState remembered in localStorage under `key` (per-viewer convenience such as
 * calculator inputs). Falls back to plain state when storage is unavailable or the
 * stored value fails `isValid`.
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // not persisted; still works for this visit
      }
    },
    [key],
  );
  return [value, set];
}
