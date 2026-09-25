import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  dateRange,
  dayPart,
  diffDays,
  fromDateKey,
  isDateKey,
  isSameDay,
  startOfWeek,
  toDateKey,
  type DateKey,
} from './date';

const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('toDateKey', () => {
  it('uses the local calendar date, not UTC', () => {
    expect(toDateKey(local(2026, 9, 25, 0, 5))).toBe('2026-09-25');
    expect(toDateKey(local(2026, 9, 25, 23, 59))).toBe('2026-09-25');
  });
  it('pads month and day', () => {
    expect(toDateKey(local(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('isDateKey', () => {
  it.each([
    ['2026-09-25', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-9-25', false],
    ['not a date', false],
  ])('%s → %s', (value, expected) => {
    expect(isDateKey(value)).toBe(expected);
  });
});

describe('addDays / diffDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });
  it('counts calendar days in both directions', () => {
    expect(diffDays('2026-09-25', '2026-09-26')).toBe(1);
    expect(diffDays('2026-09-26', '2026-09-25')).toBe(-1);
    expect(diffDays('2026-09-25', '2026-09-25')).toBe(0);
    expect(diffDays('2026-12-30', '2027-01-02')).toBe(3);
  });

  describe('across a DST change', () => {
    const originalTz = process.env.TZ;
    beforeEach(() => {
      process.env.TZ = 'Europe/Berlin';
    });
    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it('still steps exactly one calendar day', () => {
      // Europe switches clocks on the last Sunday of March / October.
      expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
      expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    });
  });
});

describe('isSameDay', () => {
  it('compares local dates', () => {
    expect(isSameDay(local(2026, 9, 25, 0, 1), local(2026, 9, 25, 23, 59))).toBe(true);
    expect(isSameDay(local(2026, 9, 25, 23, 59), local(2026, 9, 26, 0, 1))).toBe(false);
  });
});

describe('startOfWeek', () => {
  it('returns Monday', () => {
    expect(startOfWeek('2026-09-25')).toBe('2026-09-21'); // Friday → Monday
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21'); // Monday
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21'); // Sunday
  });
});

describe('dateRange', () => {
  it('is inclusive', () => {
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual<DateKey[]>([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });
  it('is empty when reversed', () => {
    expect(dateRange('2026-10-02', '2026-09-29')).toEqual([]);
  });
});

describe('fromDateKey', () => {
  it('returns local midnight', () => {
    const d = fromDateKey('2026-09-25');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 25, 0]);
  });
});

describe('dayPart', () => {
  it.each([
    [3, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'day'],
    [18, 'evening'],
    [23, 'evening'],
  ] as const)('%s:00 → %s', (hour, expected) => {
    expect(dayPart(local(2026, 9, 25, hour))).toBe(expected);
  });

  it('works with the fake system clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(2026, 9, 25, 7));
    expect(dayPart(Date.now())).toBe('morning');
    vi.useRealTimers();
  });
});
