/**
 * Calendar helpers based on the user's LOCAL date. Streaks and activity use DateKey.
 * All functions are pure: "now" is always passed in.
 */

/** Local calendar date in 'YYYY-MM-DD' form. */
export type DateKey = `${number}-${number}-${number}`;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(timestamp: number): DateKey {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` as DateKey;
}

export function isDateKey(value: string): value is DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Local midnight of the key as a Date. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Shift a key by whole calendar days (DST-safe: works on calendar fields, not ms). */
export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date.getTime());
}

/** Calendar days from `a` to `b` (b − a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const da = fromDateKey(a);
  const db = fromDateKey(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function isSameDay(a: number, b: number): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Monday of the week containing `key` (weeks start on Monday in ru-RU). */
export function startOfWeek(key: DateKey): DateKey {
  const weekday = (fromDateKey(key).getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(key, -weekday);
}

/** Inclusive list of keys from `from` to `to`. Empty when `to` is before `from`. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const days = diffDays(from, to);
  return Array.from({ length: Math.max(0, days + 1) }, (_, i) => addDays(from, i));
}

export type DayPart = 'night' | 'morning' | 'day' | 'evening';

export function dayPart(timestamp: number): DayPart {
  const h = new Date(timestamp).getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'day';
  return 'evening';
}
