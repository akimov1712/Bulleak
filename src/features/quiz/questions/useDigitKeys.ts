import { useEffect, useRef } from 'react';

/** Calls `onDigit(index)` for keys 1–9 while enabled (ignored while typing in inputs). */
export function useDigitKeys(
  count: number,
  enabled: boolean,
  onDigit: (index: number) => void,
): void {
  const handler = useRef(onDigit);
  useEffect(() => {
    handler.current = onDigit;
  });
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, count)) {
        e.preventDefault();
        handler.current(n - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, enabled]);
}
