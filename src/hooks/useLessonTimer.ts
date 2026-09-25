import { useEffect, useRef } from 'react';
import { noteActivity, startClock, tick, type ActivityClock } from '@/lib/progress/read';

const TICK_MS = 1000;
const FLUSH_MS = 15_000;
const ACTIVITY_EVENTS = ['scroll', 'keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel'];

export interface LessonTimerOptions {
  /** Persist accumulated whole seconds (called every 15 s and when leaving). */
  onFlush: (seconds: number) => void;
  /** Called on every tick with the total active seconds of this visit. */
  onTick?: (activeSec: number) => void;
  enabled?: boolean;
}

/**
 * Counts active reading time for the current visit. No React state is updated per second,
 * so the (heavy) lesson tree does not re-render while reading.
 */
export function useLessonTimer({ onFlush, onTick, enabled = true }: LessonTimerOptions): void {
  const callbacks = useRef({ onFlush, onTick });
  useEffect(() => {
    callbacks.current = { onFlush, onTick };
  });

  useEffect(() => {
    if (!enabled) return;
    let clock: ActivityClock = startClock(Date.now());
    let flushedMs = 0;

    const flush = () => {
      // Bring the clock up to date first so a flush never misses the last partial tick.
      clock = tick(clock, Date.now(), document.visibilityState === 'visible');
      const pendingSec = Math.floor((clock.activeMs - flushedMs) / 1000);
      if (pendingSec > 0) {
        flushedMs += pendingSec * 1000;
        callbacks.current.onFlush(pendingSec);
      }
    };
    const onActivity = () => {
      clock = noteActivity(clock, Date.now());
    };
    const onVisibility = () => {
      clock = tick(clock, Date.now(), document.visibilityState === 'visible');
      if (document.visibilityState === 'hidden') flush();
      else onActivity();
    };

    const ticker = window.setInterval(() => {
      clock = tick(clock, Date.now(), document.visibilityState === 'visible');
      callbacks.current.onTick?.(clock.activeMs / 1000);
    }, TICK_MS);
    const flusher = window.setInterval(flush, FLUSH_MS);

    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      window.clearInterval(ticker);
      window.clearInterval(flusher);
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [enabled]);
}
