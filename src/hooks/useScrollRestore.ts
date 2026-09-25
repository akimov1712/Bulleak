import { useEffect } from 'react';

/**
 * Remember the scroll position per key in sessionStorage and restore it once `ready`.
 * Used by lessons so that leaving for a quiz and coming back keeps the reading place.
 */
export function useScrollRestore(key: string, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const storageKey = `tc-scroll:${key}`;
    try {
      const saved = Number(sessionStorage.getItem(storageKey));
      if (saved > 0) window.scrollTo({ top: saved, behavior: 'instant' });
    } catch {
      // sessionStorage unavailable: start at the top
    }
    let timer = 0;
    function onScroll() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
        } catch {
          // ignore
        }
      }, 200);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [key, ready]);
}
