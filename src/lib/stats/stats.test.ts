import { describe, expect, it } from 'vitest';
import type { DateKey } from '@/lib/date';
import { createInitialProgress, emptyDay, emptyLessonProgress } from '@/lib/progress/initial';
import type { QuizAttempt } from '@/types/progress';
import type { SimTrade } from '@/types/trading';
import { heatmap, learningSummary, tagAccuracy, weakTopics, xpByDay } from './learning';
import { rHistogram, simStats } from './simulator';

const day = (xp: number) => ({ ...emptyDay(), xp });
const today = '2026-09-27' as DateKey; // Sunday

describe('learning stats', () => {
  it('xpByDay fills gaps with zeros, oldest first', () => {
    const activity = { '2026-09-25': day(40), '2026-09-27': day(10) } as const;
    expect(xpByDay(activity, today, 3)).toEqual([
      { key: '2026-09-25', xp: 40 },
      { key: '2026-09-26', xp: 0 },
      { key: '2026-09-27', xp: 10 },
    ]);
  });

  it('heatmap: Monday-first weeks ending with the current week, relative levels', () => {
    const grid = heatmap({ '2026-09-21': day(100), '2026-09-27': day(30) }, today, 2);
    expect(grid).toHaveLength(2);
    expect(grid[0]?.[0]?.key).toBe('2026-09-14'); // Monday two weeks back
    const lastWeek = grid[1] ?? [];
    expect(lastWeek[0]).toMatchObject({ key: '2026-09-21', level: 4 });
    expect(lastWeek[6]).toMatchObject({ key: '2026-09-27', level: 2, future: false });
    expect(grid.flat().filter((c) => c.level > 0)).toHaveLength(2);
    expect(
      heatmap({}, today, 1)
        .flat()
        .every((c) => c.level === 0),
    ).toBe(true);
  });

  it('marks days after today as future on a mid-week today', () => {
    const grid = heatmap({}, '2026-09-23' as DateKey, 1); // Wednesday
    expect(grid[0]?.map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
  });

  it('tag accuracy sums attempts; weak topics need enough answers', () => {
    const a = (tags: QuizAttempt['tags']): QuizAttempt => ({
      quizId: 'q',
      at: 0,
      ratio: 1,
      passed: true,
      tags,
    });
    const acc = tagAccuracy([
      a({ rsi: [1, 2], ema: [3, 3], macd: [0, 1] }),
      a({ rsi: [1, 2], ema: [1, 1] }),
    ]);
    expect(acc.map((x) => x.tag)).toEqual(['macd', 'rsi', 'ema']);
    expect(acc.find((x) => x.tag === 'rsi')).toMatchObject({ correct: 2, total: 4, ratio: 0.5 });
    expect(weakTopics(acc).map((x) => x.tag)).toEqual(['rsi']);
  });

  it('summary averages best scores of attempted lessons only', () => {
    const p = createInitialProgress(0);
    p.xp = 500;
    p.lessons['m00-l01'] = {
      ...emptyLessonProgress(),
      quizBest: 1,
      quizAttempts: 1,
      completedAt: 1,
      timeSpentSec: 600,
    };
    p.lessons['m00-l02'] = {
      ...emptyLessonProgress(),
      quizBest: 0.6,
      quizAttempts: 2,
      timeSpentSec: 300,
    };
    p.lessons['m00-l03'] = { ...emptyLessonProgress(), timeSpentSec: 60 };
    p.activity['2026-09-27'] = day(20);
    expect(learningSummary(p)).toMatchObject({
      xp: 500,
      lessonsCompleted: 1,
      avgQuizBest: 0.8,
      timeSec: 960,
      activeDays: 1,
    });
    expect(learningSummary(createInitialProgress(0)).avgQuizBest).toBeNull();
  });
});

describe('simulator stats', () => {
  const t = (at: number, pnl: number, r: number, balanceBefore = 10_000): SimTrade => ({
    at,
    scenarioId: null,
    dataset: 'BTCUSDT-240',
    startIndex: 0,
    side: 'long',
    entry: 1,
    sl: 1,
    tp: 1,
    riskPct: 1,
    balanceBefore,
    qty: 1,
    exitPrice: 1,
    exitIndex: 1,
    outcome: 'tp',
    pnl,
    r,
    fees: 0,
  });

  it('balance curve, best/worst and PF in time order', () => {
    const s = simStats([t(2, -100, -1, 10_200), t(1, 200, 2)]);
    expect(s.balanceCurve).toEqual([10_000, 10_200, 10_100]);
    expect(s).toMatchObject({ bestR: 2, worstR: -1, count: 2, profitFactor: 2 });
    expect(simStats([])).toMatchObject({ bestR: null, balanceCurve: [], profitFactor: null });
  });

  it('R histogram covers min…max with half-R bins', () => {
    expect(rHistogram([-1, -1, 0.2, 2])).toEqual([
      { from: -1, count: 2 },
      { from: -0.5, count: 0 },
      { from: 0, count: 1 },
      { from: 0.5, count: 0 },
      { from: 1, count: 0 },
      { from: 1.5, count: 0 },
      { from: 2, count: 1 },
    ]);
    expect(rHistogram([])).toEqual([]);
  });
});
