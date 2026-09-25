import { describe, expect, it } from 'vitest';
import type { ProgressEvent } from '@/types/events';
import type { ProgressState } from '@/types/progress';
import type { QuizResult } from '@/types/quiz';
import { createInitialProgress, emptyDay } from './initial';
import { applyEvent, hasRewards, type ApplyContext } from './applyEvent';
import { courseIndex } from '@/content/courseIndex';
import { achievements } from '@/content/achievements';
import { xpForLevel } from '@/lib/gamification/levels';

const at = (day: number, hour = 12) => new Date(2026, 8, day, hour).getTime();
const ctx = (now = at(25), dailyGoalXp = 50): ApplyContext => ({
  now,
  dailyGoalXp,
  course: courseIndex,
  achievements,
});
const pass = (ratio: number): QuizResult => ({
  quizId: 'm00-l01',
  correct: 0,
  total: 10,
  ratio,
  passed: ratio >= 0.8,
  perQuestion: [],
});

function run(state: ProgressState, events: ProgressEvent[], c = ctx()) {
  let s = state;
  const all = [];
  for (const e of events) {
    const r = applyEvent(s, e, c);
    s = r.state;
    all.push(r.rewards);
  }
  return { state: s, rewards: all };
}

describe('applyEvent', () => {
  it('reading the first lesson: +10, first-step achievement, streak 1', () => {
    const { state, rewards } = applyEvent(
      createInitialProgress(0),
      { type: 'lessonRead', lessonId: 'm00-l01' },
      ctx(),
    );
    expect(rewards.reasons.map((r) => r.label)).toEqual([
      'Урок прочитан',
      'Достижение «Первый шаг»',
    ]);
    expect(rewards.xp).toBe(20);
    expect(rewards.newAchievements).toEqual(['first-step']);
    expect(state.xp).toBe(20);
    expect(state.activity['2026-09-25']?.xp).toBe(20);
    expect(state.achievements['first-step']).toBe(at(25));
    expect(state.streak).toMatchObject({ current: 1, lastActiveDay: '2026-09-25' });
    expect(rewards.streak).toEqual({ before: 0, after: 1 });
    expect(hasRewards(rewards)).toBe(true);
  });

  it('a perfect first quiz reaches the daily goal and levels up', () => {
    const { state, rewards } = run(createInitialProgress(0), [
      { type: 'lessonRead', lessonId: 'm00-l01' },
      { type: 'quizCompleted', lessonId: 'm00-l01', result: pass(1), durationSec: 400 },
    ]);
    const quiz = rewards[1];
    const labels = quiz?.reasons.map((r) => r.label) ?? [];
    expect(labels).toContain('Тест сдан');
    expect(labels).toContain('Без ошибок');
    expect(labels).toContain('Цель дня выполнена');
    expect(quiz?.newAchievements).toEqual(expect.arrayContaining(['first-quiz', 'perfect-1']));
    expect(quiz?.dailyGoalMet).toBe(true);
    expect(quiz?.levelUp).toEqual({ from: 1, to: expect.any(Number) });
    expect(state.activity['2026-09-25']?.goalMet).toBe(true);
    expect(state.counters.dailyGoalsMet).toBe(1);
  });

  it('awards the daily goal only once per day', () => {
    const { rewards } = run(
      createInitialProgress(0),
      [
        { type: 'calculatorUsed', calcId: 'position' },
        { type: 'calculatorUsed', calcId: 'rr' },
        { type: 'calculatorUsed', calcId: 'fees' },
      ],
      ctx(at(25), 10),
    );
    expect(rewards.filter((r) => r.dailyGoalMet)).toHaveLength(1);
  });

  it('events without XP do not touch the streak', () => {
    const { state, rewards } = applyEvent(
      createInitialProgress(0),
      { type: 'lessonTime', lessonId: 'm00-l01', seconds: 30 },
      ctx(),
    );
    expect(rewards.xp).toBe(0);
    expect(hasRewards(rewards)).toBe(false);
    expect(state.streak.current).toBe(0);
    expect(state.lessons['m00-l01']?.timeSpentSec).toBe(30);
  });

  it('streak grows across days and reports before/after', () => {
    let s = applyEvent(
      createInitialProgress(0),
      { type: 'lessonRead', lessonId: 'm00-l01' },
      ctx(at(24)),
    ).state;
    const next = applyEvent(s, { type: 'calculatorUsed', calcId: 'rr' }, ctx(at(25)));
    s = next.state;
    expect(next.rewards.streak).toEqual({ before: 1, after: 2 });
    expect(s.streak.current).toBe(2);
  });

  it('sim trades count, respect the daily cap and track capped XP separately', () => {
    const events: ProgressEvent[] = Array.from({ length: 7 }, () => ({
      type: 'simTrade',
      outcome: 'tp',
      r: 2,
    }));
    const { state } = run(createInitialProgress(0), events, ctx(at(25), 1000));
    expect(state.counters.simTrades).toBe(7);
    expect(state.counters.simWins).toBe(7);
    expect(state.activity['2026-09-25']?.simXp).toBe(50);
    expect(state.activity['2026-09-25']?.simTrades).toBe(7);
  });

  it('achievement XP can unlock further achievements (level-based)', () => {
    const almost: ProgressState = { ...createInitialProgress(0), xp: xpForLevel(10) - 5 };
    const { state, rewards } = applyEvent(
      almost,
      { type: 'lessonRead', lessonId: 'm00-l01' },
      ctx(at(25), 1000),
    );
    expect(rewards.newAchievements).toEqual(expect.arrayContaining(['first-step', 'level-10']));
    expect(state.achievements['level-10']).toBeDefined();
  });

  it('journal entries update forward-test and plan-streak counters', () => {
    const entry = (followedPlan: boolean): ProgressEvent => ({
      type: 'journalEntry',
      closed: true,
      forward: true,
      followedPlan,
    });
    const { state } = run(createInitialProgress(0), [
      entry(true),
      entry(true),
      entry(false),
      entry(true),
    ]);
    expect(state.counters).toMatchObject({ journalEntries: 4, forwardTrades: 4, planStreak: 1 });
    expect(state.activity['2026-09-25']?.journalXp).toBe(30);
  });

  it('counter events: skips, glossary, backup, plan', () => {
    const { state, rewards } = run(createInitialProgress(0), [
      { type: 'simSkip', correct: true },
      { type: 'simSkip', correct: false },
      { type: 'glossaryViewed', termId: 'edge' },
      { type: 'glossaryViewed', termId: 'edge' },
      { type: 'backupMade' },
      { type: 'planSaved' },
    ]);
    expect(state.counters.simCorrectSkips).toBe(1);
    expect(state.counters.glossaryViewed).toEqual(['edge']);
    expect(state.profile.lastBackupAt).toBe(at(25));
    expect(state.counters.planWritten).toBe(true);
    expect(rewards[4]?.newAchievements).toEqual(['backup']);
    expect(rewards[5]?.newAchievements).toEqual(['plan-written']);
  });

  it('exam events record the exam and pay once', () => {
    const exam: ProgressEvent = { type: 'examCompleted', key: 'm03', result: pass(0.9) };
    const { state, rewards } = run(createInitialProgress(0), [exam, exam]);
    expect(state.exams.m03?.attempts).toBe(2);
    expect(rewards[0]?.reasons[0]).toEqual({ label: 'Экзамен модуля сдан', xp: 150 });
    expect(rewards[0]?.newAchievements).toEqual(expect.arrayContaining(['module-1', 'chartist']));
    expect(rewards[1]?.xp).toBe(0);
  });

  it('keeps activity of other days untouched', () => {
    const base: ProgressState = {
      ...createInitialProgress(0),
      activity: { '2026-09-20': { ...emptyDay(), xp: 7 } },
    };
    const { state } = applyEvent(base, { type: 'lessonRead', lessonId: 'm00-l01' }, ctx());
    expect(state.activity['2026-09-20']?.xp).toBe(7);
  });
});
