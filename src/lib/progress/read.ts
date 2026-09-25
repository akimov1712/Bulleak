/**
 * Active-time accounting and the "lesson read" rule (docs/04-features/lesson-player.md).
 * Pure: time is always passed in.
 */

/** Activity older than this no longer counts as "reading". */
export const IDLE_AFTER_MS = 60_000;
/** A single tick never adds more than this (laptop sleep, throttled background timers). */
export const MAX_TICK_MS = 5_000;

export interface ActivityClock {
  lastTickAt: number;
  lastActivityAt: number;
  activeMs: number;
}

export function startClock(now: number): ActivityClock {
  return { lastTickAt: now, lastActivityAt: now, activeMs: 0 };
}

/** User did something (scroll, key, pointer). */
export function noteActivity(clock: ActivityClock, now: number): ActivityClock {
  return { ...clock, lastActivityAt: now };
}

/** Advance the clock; counts time only while the tab is visible and the user is not idle. */
export function tick(clock: ActivityClock, now: number, visible: boolean): ActivityClock {
  const elapsed = Math.max(0, now - clock.lastTickAt);
  const active = visible && now - clock.lastActivityAt <= IDLE_AFTER_MS;
  return {
    ...clock,
    lastTickAt: now,
    activeMs: clock.activeMs + (active ? Math.min(elapsed, MAX_TICK_MS) : 0),
  };
}

/** Seconds of active reading required: 60 s or 30% of the estimate, whichever is smaller. */
export function readThresholdSec(estimatedMinutes: number): number {
  const fromEstimate = Math.max(0, estimatedMinutes) * 60 * 0.3;
  return Math.min(60, fromEstimate);
}

/** A lesson counts as read once the summary was reached and enough active time passed. */
export function isLessonRead(
  summarySeen: boolean,
  activeSec: number,
  estimatedMinutes: number,
): boolean {
  return summarySeen && activeSec >= readThresholdSec(estimatedMinutes);
}
