import type { AchievementDef } from '@/types/achievements';
import type { ProgressEvent, RewardReason, Rewards } from '@/types/events';
import type { ProgressState } from '@/types/progress';
import type { CourseIndex } from '@/lib/content';
import { toDateKey } from '@/lib/date';
import { sumXp, XP, xpForEvent } from '@/lib/gamification/xp';
import { levelFromXp } from '@/lib/gamification/levels';
import { applyActivity, effectiveStreak } from '@/lib/gamification/streak';
import { evaluateAchievements } from '@/lib/gamification/achievements';
import { emptyDay } from './initial';
import { addLessonTime, markLessonRead, recordExam, recordLessonQuiz } from './actions';

export interface ApplyContext {
  now: number;
  /** User setting: XP needed for the daily goal. */
  dailyGoalXp: number;
  course: CourseIndex;
  achievements: readonly AchievementDef[];
}

/** State change of the event itself (no XP, streak or achievements). */
function transition(state: ProgressState, event: ProgressEvent, now: number): ProgressState {
  const c = state.counters;
  switch (event.type) {
    case 'lessonRead':
      return markLessonRead(state, event.lessonId, now);
    case 'lessonTime':
      return addLessonTime(state, event.lessonId, event.seconds, now);
    case 'quizCompleted':
      return recordLessonQuiz(state, event.lessonId, event.result, now, event.durationSec);
    case 'examCompleted':
      return recordExam(state, event.key, event.result, now, event.durationSec);
    case 'simTrade': {
      const key = toDateKey(now);
      const day = state.activity[key] ?? emptyDay();
      return {
        ...state,
        activity: { ...state.activity, [key]: { ...day, simTrades: day.simTrades + 1 } },
        counters: {
          ...c,
          simTrades: c.simTrades + 1,
          simWins: c.simWins + (event.r > 0 ? 1 : 0),
          backtestTrades: c.backtestTrades + (event.backtest ? 1 : 0),
        },
      };
    }
    case 'simSkip':
      return event.correct && !c.simSkippedScenarios.includes(event.scenarioId)
        ? {
            ...state,
            counters: { ...c, simSkippedScenarios: [...c.simSkippedScenarios, event.scenarioId] },
          }
        : state;
    case 'journalEntry':
      return {
        ...state,
        counters: {
          ...c,
          journalEntries: c.journalEntries + 1,
          forwardTrades: c.forwardTrades + (event.closed && event.forward ? 1 : 0),
          planStreak: event.closed ? (event.followedPlan ? c.planStreak + 1 : 0) : c.planStreak,
        },
      };
    case 'calculatorUsed':
      return c.calculatorsUsed.includes(event.calcId)
        ? state
        : { ...state, counters: { ...c, calculatorsUsed: [...c.calculatorsUsed, event.calcId] } };
    case 'glossaryViewed':
      return c.glossaryViewed.includes(event.termId)
        ? state
        : { ...state, counters: { ...c, glossaryViewed: [...c.glossaryViewed, event.termId] } };
    case 'backupMade':
      return { ...state, profile: { ...state.profile, lastBackupAt: now } };
    case 'planSaved':
      return c.planWritten ? state : { ...state, counters: { ...c, planWritten: true } };
    case 'backtestEvaluated':
      return state;
  }
}

/** Add XP to the total and today's activity (tracking capped sources separately). */
function addXp(
  state: ProgressState,
  amount: number,
  now: number,
  source: 'sim' | 'journal' | 'other' = 'other',
): ProgressState {
  if (amount <= 0) return state;
  const key = toDateKey(now);
  const day = state.activity[key] ?? emptyDay();
  return {
    ...state,
    xp: state.xp + amount,
    activity: {
      ...state.activity,
      [key]: {
        ...day,
        xp: day.xp + amount,
        simXp: day.simXp + (source === 'sim' ? amount : 0),
        journalXp: day.journalXp + (source === 'journal' ? amount : 0),
      },
    },
  };
}

/** Award the daily-goal bonus once per day when today's XP reaches the goal. */
function checkDailyGoal(
  state: ProgressState,
  now: number,
  goal: number,
): { state: ProgressState; reason: RewardReason | null } {
  const key = toDateKey(now);
  const day = state.activity[key];
  if (!day || day.goalMet || day.xp < goal) return { state, reason: null };
  const marked: ProgressState = {
    ...state,
    activity: { ...state.activity, [key]: { ...day, goalMet: true } },
    counters: { ...state.counters, dailyGoalsMet: state.counters.dailyGoalsMet + 1 },
  };
  return {
    state: addXp(marked, XP.dailyGoal, now),
    reason: { label: 'Цель дня выполнена', xp: XP.dailyGoal },
  };
}

/**
 * The single progress pipeline: event → new state + rewards to celebrate.
 * Order: event transition → event XP → daily goal → achievements (repeated while
 * achievement XP unlocks more, e.g. level-based ones) → daily goal again → streak.
 */
export function applyEvent(
  before: ProgressState,
  event: ProgressEvent,
  ctx: ApplyContext,
): { state: ProgressState; rewards: Rewards } {
  const { now } = ctx;
  const today = toDateKey(now);
  const reasons: RewardReason[] = xpForEvent(before, event, now);
  const source =
    event.type === 'simTrade' ? 'sim' : event.type === 'journalEntry' ? 'journal' : 'other';

  let state = addXp(transition(before, event, now), sumXp(reasons), now, source);

  const goal1 = checkDailyGoal(state, now, ctx.dailyGoalXp);
  state = goal1.state;
  if (goal1.reason) reasons.push(goal1.reason);

  const newAchievements: string[] = [];
  for (let round = 0; round < 5; round++) {
    const earned = evaluateAchievements(ctx.achievements, state, {
      now,
      event,
      course: ctx.course,
    });
    if (earned.length === 0) break;
    for (const def of earned) {
      newAchievements.push(def.id);
      reasons.push({ label: `Достижение «${def.title}»`, xp: def.xp });
      state = addXp(
        { ...state, achievements: { ...state.achievements, [def.id]: now } },
        def.xp,
        now,
      );
    }
  }

  const goal2 = checkDailyGoal(state, now, ctx.dailyGoalXp);
  state = goal2.state;
  if (goal2.reason) reasons.push(goal2.reason);

  const streakBefore = effectiveStreak(before.streak, today).value;
  if ((state.activity[today]?.xp ?? 0) > 0)
    state = { ...state, streak: applyActivity(state.streak, today) };

  const levelFrom = levelFromXp(before.xp).level;
  const levelTo = levelFromXp(state.xp).level;

  return {
    state,
    rewards: {
      xp: state.xp - before.xp,
      reasons,
      newAchievements,
      levelUp: levelTo > levelFrom ? { from: levelFrom, to: levelTo } : null,
      dailyGoalMet: Boolean(goal1.reason ?? goal2.reason),
      streak: {
        before: streakBefore,
        after: state.streak.lastActiveDay === today ? state.streak.current : streakBefore,
      },
    },
  };
}

/** Whether rewards contain anything worth showing. */
export function hasRewards(r: Rewards): boolean {
  return r.xp > 0 || r.newAchievements.length > 0 || r.levelUp !== null || r.dailyGoalMet;
}
