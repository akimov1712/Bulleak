import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

/**
 * useState remembered in localStorage under `key` (per-viewer convenience such as
 * calculator inputs). Falls back to plain state when storage is unavailable or the
 * stored value fails `isValid`.
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, (next: SetStateAction<T>) => void] {
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
  // Persist after every change (also covers functional updates made in quick succession).
  const changed = useRef(false);
  useEffect(() => {
    if (!changed.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // not persisted; still works for this visit
    }
  }, [key, value]);
  const set = useCallback((next: SetStateAction<T>) => {
    changed.current = true;
    setValue(next);
  }, []);
  return [value, set];
}
