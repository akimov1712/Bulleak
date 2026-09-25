import type { DayActivity, Streak } from '@/types/progress';
import { addDays, diffDays, startOfWeek, type DateKey } from '@/lib/date';

/** docs/04-features/gamification.md («Стрик»). */
export const MAX_FREEZES = 2;
export const FREEZE_EVERY_DAYS = 7;

/**
 * Register activity (≥1 XP) on `day`. Missed days are covered by freezes if there are enough;
 * otherwise the streak restarts at 1. A freeze is earned for every 7 consecutive days.
 */
export function applyActivity(streak: Streak, day: DateKey): Streak {
  if (streak.lastActiveDay === day) return streak;

  let current: number;
  let freezes = streak.freezes;
  if (streak.lastActiveDay === null) {
    current = 1;
  } else {
    const gap = diffDays(streak.lastActiveDay, day);
    if (gap < 0) return streak; // clock went backwards: ignore
    const missed = gap - 1;
    if (missed === 0) current = streak.current + 1;
    else if (missed <= freezes) {
      freezes -= missed;
      current = streak.current + 1;
    } else current = 1;
  }

  if (current % FREEZE_EVERY_DAYS === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastActiveDay: day,
    freezes,
  };
}

/**
 * Streak as it stands today, before any activity today: still alive if yesterday was active
 * or the gap can be covered by freezes; otherwise it is effectively lost (0).
 */
export function effectiveStreak(
  streak: Streak,
  today: DateKey,
): { value: number; atRisk: boolean } {
  if (streak.lastActiveDay === null) return { value: 0, atRisk: false };
  const gap = diffDays(streak.lastActiveDay, today);
  if (gap <= 0) return { value: streak.current, atRisk: false };
  if (gap - 1 <= streak.freezes) return { value: streak.current, atRisk: true };
  return { value: 0, atRisk: false };
}

export interface WeekDay {
  day: DateKey;
  /** Пн, Вт, … */
  label: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Monday–Sunday of the current week with activity marks. */
export function weekView(
  activity: Partial<Record<DateKey, DayActivity>>,
  today: DateKey,
): WeekDay[] {
  const monday = startOfWeek(today);
  return WEEKDAY_LABELS.map((label, i) => {
    const day = addDays(monday, i);
    const offset = diffDays(today, day);
    return {
      day,
      label,
      active: (activity[day]?.xp ?? 0) > 0,
      isToday: offset === 0,
      isFuture: offset > 0,
    };
  });
}
