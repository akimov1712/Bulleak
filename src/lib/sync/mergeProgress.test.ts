import { describe, expect, it } from 'vitest';
import { addDays, type DateKey } from '@/lib/date';
import { createInitialProgress, emptyDay, emptyLessonProgress } from '@/lib/progress/initial';
import { mulberry32, pick, randomInt, type Rng } from '@/lib/random';
import type { ProgressState } from '@/types/progress';
import { mergeProgress } from './mergeProgress';

const T0 = Date.UTC(2026, 10, 1);
const base = (patch: Partial<ProgressState> = {}): ProgressState => ({
  ...createInitialProgress(T0),
  ...patch,
});

describe('mergeProgress rules', () => {
  it('unions lessons: earliest dates, best scores and counts', () => {
    const a = base({
      lessons: {
        'm00-l01': {
          ...emptyLessonProgress(),
          readAt: 200,
          quizBest: 0.8,
          quizAttempts: 1,
          completedAt: 300,
          timeSpentSec: 60,
          xpEarned: 50,
        },
        'm00-l02': { ...emptyLessonProgress(), readAt: 400 },
      },
    });
    const b = base({
      lessons: {
        'm00-l01': {
          ...emptyLessonProgress(),
          readAt: 150,
          quizBest: 1,
          quizAttempts: 3,
          completedAt: 500,
          timeSpentSec: 90,
          xpEarned: 70,
          improvements: 1,
        },
      },
    });
    const m = mergeProgress(a, b);
    expect(m.lessons['m00-l01']).toEqual({
      readAt: 150,
      quizBest: 1,
      quizAttempts: 3,
      completedAt: 300,
      timeSpentSec: 90,
      xpEarned: 70,
      improvements: 1,
    });
    expect(m.lessons['m00-l02']?.readAt).toBe(400);
  });

  it('keeps the first pass of an exam and the latest attempt', () => {
    const m = mergeProgress(
      base({ exams: { m01: { best: 0.7, attempts: 2, lastAttemptAt: 100 } } }),
      base({ exams: { m01: { best: 0.9, attempts: 1, passedAt: 90, lastAttemptAt: 90 } } }),
    );
    expect(m.exams.m01).toEqual({ best: 0.9, attempts: 2, passedAt: 90, lastAttemptAt: 100 });
  });

  it('keeps XP and days earned offline on both devices', () => {
    const a = base({
      xp: 150,
      activity: {
        '2026-11-01': { ...emptyDay(), xp: 100 },
        '2026-11-02': { ...emptyDay(), xp: 50 },
      },
    });
    const b = base({
      xp: 130,
      activity: {
        '2026-11-01': { ...emptyDay(), xp: 100 },
        '2026-11-03': { ...emptyDay(), xp: 30, goalMet: true },
      },
    });
    const m = mergeProgress(a, b);
    expect(m.xp).toBe(180);
    expect(Object.keys(m.activity).sort()).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(m.activity['2026-11-03']?.goalMet).toBe(true);
  });

  it('rebuilds the streak from the days of both devices', () => {
    const day = (key: DateKey) => ({ [key]: { ...emptyDay(), xp: 10 } });
    const a = base({
      activity: { ...day('2026-11-01'), ...day('2026-11-03') },
      streak: { current: 1, longest: 1, lastActiveDay: '2026-11-03', freezes: 0 },
    });
    const b = base({
      activity: { ...day('2026-11-02') },
      streak: { current: 1, longest: 1, lastActiveDay: '2026-11-02', freezes: 0 },
    });
    expect(mergeProgress(a, b).streak).toEqual({
      current: 3,
      longest: 3,
      lastActiveDay: '2026-11-03',
      freezes: 0,
    });
  });

  it('does not shorten a streak the history no longer shows', () => {
    const a = base({
      activity: { '2026-11-03': { ...emptyDay(), xp: 10 } },
      streak: { current: 40, longest: 40, lastActiveDay: '2026-11-03', freezes: 2 },
    });
    expect(mergeProgress(a, base()).streak).toMatchObject({ current: 40, longest: 40, freezes: 2 });
  });

  it('unions achievements with the earliest time and attempts without duplicates', () => {
    const attempt = (at: number, ratio: number) => ({
      quizId: 'm00-l01',
      at,
      ratio,
      passed: ratio >= 0.8,
      tags: {},
    });
    const m = mergeProgress(
      base({
        achievements: { first: 20, second: 5 },
        quizAttempts: [attempt(1, 0.5), attempt(3, 0.9)],
      }),
      base({ achievements: { first: 10 }, quizAttempts: [attempt(2, 0.7), attempt(3, 0.9)] }),
    );
    expect(m.achievements).toEqual({ first: 10, second: 5 });
    expect(m.quizAttempts.map((x) => x.at)).toEqual([1, 2, 3]);
  });

  it('keeps the per-question answers of attempts from either device', () => {
    const answers = [{ q: 'm00-l01-q1', ok: true, tags: ['risk'], type: 'single' as const }];
    const attempt = { quizId: 'm00-l01', at: 5, ratio: 1, passed: true, tags: {}, answers };
    const m = mergeProgress(base({ quizAttempts: [attempt] }), base());
    expect(m.quizAttempts[0]?.answers).toEqual(answers);
  });

  it('keeps only the newest 500 attempts', () => {
    const many = (from: number) =>
      Array.from({ length: 300 }, (_, i) => ({
        quizId: 'q',
        at: from + i,
        ratio: 1,
        passed: true,
        tags: {},
      }));
    const m = mergeProgress(base({ quizAttempts: many(0) }), base({ quizAttempts: many(1000) }));
    expect(m.quizAttempts).toHaveLength(500);
    expect(m.quizAttempts[0]?.at).toBe(100);
    expect(m.quizAttempts.at(-1)?.at).toBe(1299);
  });

  it('takes the larger counters and the union of lists', () => {
    const counters = createInitialProgress(T0).counters;
    const m = mergeProgress(
      base({ counters: { ...counters, simTrades: 5, calculatorsUsed: ['rr', 'position'] } }),
      base({
        counters: { ...counters, simTrades: 3, calculatorsUsed: ['fees'], planWritten: true },
      }),
    );
    expect(m.counters).toMatchObject({
      simTrades: 5,
      calculatorsUsed: ['fees', 'position', 'rr'],
      planWritten: true,
    });
  });

  it('lets the newest edit win for the name, plan and strategy', () => {
    const m = mergeProgress(
      base({
        profile: { name: 'Аня', updatedAt: 100, startedAt: 50 },
        tradingPlan: { sections: { goals: 'старый' }, updatedAt: 300 },
        strategy: { name: 'Моя', rules: ['a'], updatedAt: 10 },
      }),
      base({
        profile: { name: 'Анна', updatedAt: 200, startedAt: 70 },
        tradingPlan: { sections: { goals: 'новый' }, updatedAt: 200 },
        strategy: null,
      }),
    );
    expect(m.profile).toMatchObject({ name: 'Анна', startedAt: 50 });
    expect(m.tradingPlan?.sections.goals).toBe('старый');
    expect(m.strategy?.name).toBe('Моя');
  });

  it('prefers a set name over an empty one, whatever the times', () => {
    const m = mergeProgress(
      base({ profile: { name: '', updatedAt: 999, startedAt: 1 } }),
      base({ profile: { name: 'Ника', startedAt: 1 } }),
    );
    expect(m.profile.name).toBe('Ника');
  });
});

/** Random but plausible progress: overlapping lessons, days, attempts and edits. */
function randomState(rng: Rng): ProgressState {
  const lessonIds = ['m00-l01', 'm00-l02', 'm01-l01', 'm01-l02'] as const;
  const days: DateKey[] = Array.from({ length: 10 }, (_, i) => addDays('2026-11-01', i));
  const state = base({ xp: randomInt(rng, 0, 500) });
  for (const id of lessonIds) {
    if (rng() < 0.5) continue;
    state.lessons[id] = {
      ...emptyLessonProgress(),
      readAt: rng() < 0.7 ? randomInt(rng, 1, 50) : undefined,
      quizBest: randomInt(rng, 0, 10) / 10,
      quizAttempts: randomInt(rng, 0, 5),
      completedAt: rng() < 0.5 ? randomInt(rng, 1, 50) : undefined,
      timeSpentSec: randomInt(rng, 0, 900),
      xpEarned: randomInt(rng, 0, 100),
    };
  }
  for (const day of days) {
    if (rng() < 0.5) continue;
    state.activity[day] = { ...emptyDay(), xp: randomInt(rng, 0, 80), goalMet: rng() < 0.3 };
  }
  for (let i = 0; i < randomInt(rng, 0, 6); i += 1) {
    state.quizAttempts.push({
      quizId: pick(lessonIds, rng) ?? 'q',
      at: randomInt(rng, 1, 20),
      ratio: randomInt(rng, 0, 10) / 10,
      passed: rng() < 0.5,
      tags: {},
    });
  }
  state.quizAttempts.sort((x, y) => x.at - y.at);
  if (rng() < 0.6) state.achievements[pick(['a', 'b', 'c'], rng) ?? 'a'] = randomInt(rng, 1, 30);
  state.profile = {
    name: pick(['', 'Аня', 'Анна', 'Ника'], rng) ?? '',
    updatedAt: randomInt(rng, 0, 5),
    startedAt: randomInt(rng, 1, 9),
  };
  state.tradingPlan =
    rng() < 0.5
      ? null
      : { sections: { goals: pick(['x', 'y'], rng) ?? 'x' }, updatedAt: randomInt(rng, 1, 3) };
  state.counters.calculatorsUsed = rng() < 0.5 ? ['rr'] : ['position', 'fees'];
  state.counters.simTrades = randomInt(rng, 0, 9);
  return state;
}

describe('mergeProgress properties', () => {
  const rng = mulberry32(20261110);
  const cases = Array.from(
    { length: 300 },
    () => [randomState(rng), randomState(rng), randomState(rng)] as const,
  );

  it('is commutative', () => {
    for (const [a, b] of cases) expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
  });

  it('is associative', () => {
    for (const [a, b, c] of cases) {
      expect(mergeProgress(mergeProgress(a, b), c)).toEqual(mergeProgress(a, mergeProgress(b, c)));
    }
  });

  it('is idempotent on its results', () => {
    for (const [a, b] of cases) {
      const m = mergeProgress(a, b);
      expect(mergeProgress(m, m)).toEqual(m);
      expect(mergeProgress(m, a)).toEqual(m);
    }
  });

  it('never loses what either side earned', () => {
    for (const [a, b] of cases) {
      const m = mergeProgress(a, b);
      expect(m.xp).toBeGreaterThanOrEqual(Math.max(a.xp, b.xp));
      for (const id of Object.keys({
        ...a.lessons,
        ...b.lessons,
      }) as (keyof ProgressState['lessons'])[]) {
        expect(m.lessons[id]?.quizBest).toBe(
          Math.max(a.lessons[id]?.quizBest ?? 0, b.lessons[id]?.quizBest ?? 0),
        );
      }
      expect(Object.keys(m.achievements).sort()).toEqual(
        [...new Set([...Object.keys(a.achievements), ...Object.keys(b.achievements)])].sort(),
      );
    }
  });
});
