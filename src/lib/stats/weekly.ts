/** Weekly report (docs/04-features/stats-v2.md, section 9): the last 7 days at a glance. */
import type { ProgressState } from '@/types/progress';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { addDays, dateRange, toDateKey } from '@/lib/date';
import type { AnswerEvent } from '@/lib/learner/events';
import { DEFAULT_BKT, knowledgeBySkill } from '@/lib/learner/knowledge';
import {
  disciplineChecks,
  journalDisciplineTrades,
  simDisciplineTrades,
  type DisciplineTrade,
} from '@/lib/discipline/rules';

const DAY_MS = 86_400_000;
export const WEEK_DAYS = 7;
/** A skill's K changed at least this much over the week: worth listing. */
export const SKILL_CHANGE = 0.1;

export interface SkillChange {
  skill: string;
  before: number;
  after: number;
}

export interface WeeklyReport {
  from: number;
  to: number;
  learning: {
    xp: number;
    activeDays: number;
    lessonsCompleted: number;
    answers: number;
    correct: number;
  };
  practice: {
    simTrades: number;
    journalTrades: number;
    /** Kept / checked rules over the week's own trades (both sources); null without checks. */
    discipline: number | null;
    broken: number;
  };
  /** Skills whose knowledge moved by SKILL_CHANGE or more, biggest change first. */
  skills: SkillChange[];
}

/** Checks of the trades that started in [from, to] (context from earlier trades is kept). */
function weekChecks(all: readonly DisciplineTrade[], from: number, to: number) {
  const checks = disciplineChecks(all);
  return all.flatMap((t, i) => (t.at >= from && t.at <= to ? (checks[i] ?? []) : []));
}

export function weeklyReport(input: {
  progress: Pick<ProgressState, 'activity'>;
  answers: readonly AnswerEvent[];
  sim: readonly SimTrade[];
  journal: readonly JournalTrade[];
  now: number;
}): WeeklyReport {
  const { now } = input;
  const from = now - WEEK_DAYS * DAY_MS;
  const today = toDateKey(now);
  const days = dateRange(addDays(today, -(WEEK_DAYS - 1)), today);
  const activity = days.map((d) => input.progress.activity[d]).filter((d) => d !== undefined);
  const weekAnswers = input.answers.filter((e) => e.at >= from && e.at <= now);

  const checks = [
    ...weekChecks(simDisciplineTrades(input.sim), from, now),
    ...weekChecks(journalDisciplineTrades(input.journal), from, now),
  ];
  const kept = checks.filter((c) => c.ok).length;

  const before = knowledgeBySkill(
    input.answers.filter((e) => e.at < from),
    from,
  );
  const after = knowledgeBySkill(input.answers, now);
  const changed = new Set(weekAnswers.flatMap((e) => e.skills));
  const skills = [...changed]
    .map((skill) => ({
      skill,
      // A skill first answered this week starts from the model's prior, not from zero.
      before: before.get(skill)?.p ?? DEFAULT_BKT.pL0,
      after: after.get(skill)?.p ?? 0,
    }))
    .filter((c) => Math.abs(c.after - c.before) >= SKILL_CHANGE)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));

  return {
    from,
    to: now,
    learning: {
      xp: activity.reduce((s, d) => s + d.xp, 0),
      activeDays: activity.filter((d) => d.xp > 0 || d.quizzes > 0 || d.minutes > 0).length,
      lessonsCompleted: activity.reduce((s, d) => s + d.lessonsCompleted, 0),
      answers: weekAnswers.length,
      correct: weekAnswers.filter((e) => e.ok).length,
    },
    practice: {
      simTrades: input.sim.filter((t) => !t.deleted && !t.strategyTag && t.at >= from).length,
      journalTrades: journalDisciplineTrades(input.journal).filter((t) => t.at >= from).length,
      discipline: checks.length > 0 ? (kept / checks.length) * 100 : null,
      broken: checks.length - kept,
    },
    skills,
  };
}
