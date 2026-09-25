import { describe, expect, it } from 'vitest';
import type { Streak } from '@/types/progress';
import { emptyDay } from '@/lib/progress/initial';
import { levelFromXp, MAX_LEVEL, rankForLevel, xpForLevel } from './levels';
import { applyActivity, effectiveStreak, weekView } from './streak';
import { course } from '@/content/course';

describe('levels', () => {
  it('thresholds grow monotonically and are rounded to tens', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(60);
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(xpForLevel(l) % 10).toBe(0);
      expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
    }
    expect(xpForLevel(99)).toBe(xpForLevel(MAX_LEVEL));
  });

  it('levelFromXp at boundaries', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, rank: 'Новичок', intoLevel: 0, toNext: 60 });
    expect(levelFromXp(59).level).toBe(1);
    expect(levelFromXp(60)).toMatchObject({ level: 2, intoLevel: 0 });
    expect(levelFromXp(-10).level).toBe(1);
    expect(levelFromXp(Number.NaN).level).toBe(1);
    const max = levelFromXp(1_000_000);
    expect(max).toMatchObject({
      level: 20,
      isMax: true,
      progress: 1,
      toNext: 0,
      rank: 'Мастер рынка',
    });
  });

  it('progress is a fraction inside the level', () => {
    const half = (xpForLevel(5) + xpForLevel(6)) / 2;
    expect(levelFromXp(half).progress).toBeCloseTo(0.5, 1);
  });

  it('ranks change every two levels', () => {
    expect([1, 2, 3, 4, 5, 19, 20].map(rankForLevel)).toEqual([
      'Новичок',
      'Новичок',
      'Наблюдатель',
      'Наблюдатель',
      'Ученик',
      'Мастер рынка',
      'Мастер рынка',
    ]);
  });

  it('level 20 is reachable with the course XP plus practice (gamification.md estimate)', () => {
    const lessons = course.reduce((n, m) => n + m.lessons.length, 0);
    const exams = course.filter((m) => m.hasExam).length;
    // reading + first pass + typical bonus, exams, final, ~100 sim trades, ~40 journal entries
    const estimate = lessons * (10 + 50 + 10) + exams * 150 + 500 + 100 * 7 + 40 * 10;
    expect(estimate).toBeGreaterThanOrEqual(xpForLevel(MAX_LEVEL) * 0.9);
  });
});

const s = (patch: Partial<Streak> = {}): Streak => ({
  current: 0,
  longest: 0,
  lastActiveDay: null,
  freezes: 0,
  ...patch,
});

describe('applyActivity', () => {
  it('starts at 1 and grows day by day', () => {
    let st = applyActivity(s(), '2026-09-25');
    expect(st).toMatchObject({ current: 1, longest: 1, lastActiveDay: '2026-09-25' });
    st = applyActivity(st, '2026-09-26');
    expect(st.current).toBe(2);
  });

  it('is idempotent within a day and ignores the clock going back', () => {
    const st = s({ current: 3, longest: 3, lastActiveDay: '2026-09-25' });
    expect(applyActivity(st, '2026-09-25')).toBe(st);
    expect(applyActivity(st, '2026-09-24')).toBe(st);
  });

  it('resets after a missed day without freezes', () => {
    const st = applyActivity(
      s({ current: 5, longest: 9, lastActiveDay: '2026-09-20' }),
      '2026-09-22',
    );
    expect(st).toMatchObject({ current: 1, longest: 9 });
  });

  it('spends freezes to cover missed days', () => {
    const one = applyActivity(
      s({ current: 5, lastActiveDay: '2026-09-20', freezes: 2 }),
      '2026-09-22',
    );
    expect(one).toMatchObject({ current: 6, freezes: 1 });
    const two = applyActivity(
      s({ current: 5, lastActiveDay: '2026-09-20', freezes: 2 }),
      '2026-09-23',
    );
    expect(two).toMatchObject({ current: 6, freezes: 0 });
    const tooMany = applyActivity(
      s({ current: 5, lastActiveDay: '2026-09-20', freezes: 2 }),
      '2026-09-24',
    );
    expect(tooMany).toMatchObject({ current: 1, freezes: 2 });
  });

  it('earns a freeze every 7 days, at most 2', () => {
    let st = s();
    for (let i = 0; i < 21; i++)
      st = applyActivity(
        st,
        `2026-10-${String(i + 1).padStart(2, '0')}` as `${number}-${number}-${number}`,
      );
    expect(st.current).toBe(21);
    expect(st.freezes).toBe(2);
  });

  it('works across month boundaries', () => {
    const st = applyActivity(s({ current: 2, lastActiveDay: '2026-09-30' }), '2026-10-01');
    expect(st.current).toBe(3);
  });
});

describe('effectiveStreak', () => {
  it('reports the state before today’s activity', () => {
    expect(effectiveStreak(s(), '2026-09-25')).toEqual({ value: 0, atRisk: false });
    expect(effectiveStreak(s({ current: 4, lastActiveDay: '2026-09-25' }), '2026-09-25')).toEqual({
      value: 4,
      atRisk: false,
    });
    expect(effectiveStreak(s({ current: 4, lastActiveDay: '2026-09-24' }), '2026-09-25')).toEqual({
      value: 4,
      atRisk: true,
    });
    expect(effectiveStreak(s({ current: 4, lastActiveDay: '2026-09-22' }), '2026-09-25')).toEqual({
      value: 0,
      atRisk: false,
    });
    expect(
      effectiveStreak(s({ current: 4, lastActiveDay: '2026-09-22', freezes: 2 }), '2026-09-25'),
    ).toEqual({ value: 4, atRisk: true });
  });
});

describe('weekView', () => {
  it('returns Monday..Sunday with activity, today and future flags', () => {
    const week = weekView(
      { '2026-09-22': { ...emptyDay(), xp: 10 }, '2026-09-25': { ...emptyDay(), xp: 0 } },
      '2026-09-25',
    );
    expect(week.map((d) => d.label)).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
    expect(week[0]?.day).toBe('2026-09-21');
    expect(week[1]?.active).toBe(true);
    expect(week[4]).toMatchObject({
      day: '2026-09-25',
      isToday: true,
      active: false,
      isFuture: false,
    });
    expect(week[5]?.isFuture).toBe(true);
  });
});
