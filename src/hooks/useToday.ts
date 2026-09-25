import { useSyncExternalStore } from 'react';
import { toDateKey, type DateKey } from '@/lib/date';

function subscribe(onChange: () => void): () => void {
  let timer = 0;
  const schedule = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    timer = window.setTimeout(
      () => {
        onChange();
        schedule();
      },
      nextMidnight - now.getTime() + 500,
    );
  };
  schedule();
  // Tabs left open overnight: also re-check when the tab becomes visible again.
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onChange);
  };
}

const getToday = (): DateKey => toDateKey(Date.now());

/** Today's local date key; re-renders when the day changes. */
export function useToday(): DateKey {
  return useSyncExternalStore(subscribe, getToday, getToday);
}
