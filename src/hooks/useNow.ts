import { useSyncExternalStore } from 'react';

const STEP_MS = 10_000;

// Rounded to the step so repeated snapshot reads within one render agree.
const getSnapshot = () => Math.floor(Date.now() / STEP_MS) * STEP_MS;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, STEP_MS);
  return () => window.clearInterval(timer);
}

/** Current time (ms), updated every 10 s — for countdowns in minutes. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
