/**
 * Spaced review of skills (docs/04-features/learner-model.md, section 7). Derived from answer
 * events: nothing is stored besides the attempts themselves.
 */
import type { Question } from '@/types/quiz';
import { shuffle, type Rng } from '@/lib/random';
import type { AnswerEvent } from './events';
import type { SkillKnowledge } from './knowledge';

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60] as const;
/** A session with at least this share of right answers moves the skill to the next interval. */
export const REVIEW_PASS = 0.8;
export const REVIEW_SKILLS_PER_DAY = 3;
export const REVIEW_QUESTIONS = 5;
/** quizId of review attempts. */
export const REVIEW_QUIZ_ID = 'review';

const DAY_MS = 86_400_000;

export interface ReviewItem {
  skill: string;
  /** Index into REVIEW_INTERVALS_DAYS. */
  step: number;
  lastAt: number;
  dueAt: number;
}

/**
 * Review step per skill. A session is one attempt (quiz and moment); within it, the share of
 * right answers on the skill decides: pass → next interval, otherwise back to the first.
 */
export function reviewSchedule(events: readonly AnswerEvent[]): Map<string, ReviewItem> {
  const sessions = new Map<string, Map<string, { at: number; ok: number; total: number }>>();
  for (const e of events) {
    const key = `${e.quizId}@${e.at}`;
    for (const skill of e.skills) {
      const bySession = sessions.get(skill) ?? new Map();
      const s = bySession.get(key) ?? { at: e.at, ok: 0, total: 0 };
      bySession.set(key, { at: s.at, ok: s.ok + (e.ok ? 1 : 0), total: s.total + 1 });
      sessions.set(skill, bySession);
    }
  }
  const out = new Map<string, ReviewItem>();
  const last = REVIEW_INTERVALS_DAYS.length - 1;
  for (const [skill, bySession] of sessions) {
    let step = -1;
    let lastAt = 0;
    for (const s of [...bySession.values()].sort((a, b) => a.at - b.at)) {
      step = s.ok / s.total + 1e-9 >= REVIEW_PASS ? Math.min(step + 1, last) : 0;
      lastAt = s.at;
    }
    const safeStep = Math.max(0, step);
    out.set(skill, {
      skill,
      step: safeStep,
      lastAt,
      dueAt: lastAt + (REVIEW_INTERVALS_DAYS[safeStep] ?? 1) * DAY_MS,
    });
  }
  return out;
}

/**
 * Skills to review now, most urgent first, at most `limit`: overdue by the schedule. Lower K
 * goes first on a tie. (No separate «forgot» trigger: with a 30-day half-life it fired after
 * ~15 days and made the 30- and 60-day intervals meaningless.)
 */
export function dueReviews(
  schedule: ReadonlyMap<string, ReviewItem>,
  knowledge: ReadonlyMap<string, SkillKnowledge>,
  now: number,
  limit = REVIEW_SKILLS_PER_DAY,
): ReviewItem[] {
  const due = [...schedule.values()].filter((item) => now >= item.dueAt);
  const p = (id: string) => knowledge.get(id)?.p ?? 0;
  return due
    .sort((a, b) => a.dueAt - b.dueAt || p(a.skill) - p(b.skill) || (a.skill < b.skill ? -1 : 1))
    .slice(0, limit);
}

/**
 * Questions for a review session: round-robin over the due skills, within a skill those
 * answered wrong last time first, then the ones not seen for longest. `pool` is every
 * question of the skills' lessons; `skillsOf` maps a question to its skills.
 */
export function pickReviewQuestions(
  pool: readonly Question[],
  skills: readonly string[],
  skillsOf: (q: Question) => readonly string[],
  history: ReadonlyMap<string, { at: number; ok: boolean }>,
  rng: Rng,
  count = REVIEW_QUESTIONS,
): Question[] {
  const unique = [...new Map(pool.map((q) => [q.id, q])).values()];
  const rank = (q: Question) => {
    const h = history.get(q.id);
    // Wrong last time: most useful; never seen: next; right: oldest first.
    return h === undefined ? 1 : h.ok ? 2 + h.at / 1e15 : 0;
  };
  const queues = skills.map((skill) =>
    shuffle(
      unique.filter((q) => skillsOf(q).includes(skill)),
      rng,
    ).sort((a, b) => rank(a) - rank(b)),
  );
  const picked: Question[] = [];
  const taken = new Set<string>();
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      while (queue.length > 0 && taken.has(queue[0]?.id ?? '')) queue.shift();
      const q = queue.shift();
      if (q && picked.length < count) {
        picked.push(q);
        taken.add(q.id);
      }
    }
  }
  return picked;
}

/**
 * Lessons to draw review questions from: the skills' lessons the learner has studied (`studied`),
 * so a review never asks about a lesson not read yet.
 */
export function reviewLessons<L extends string>(
  skills: readonly string[],
  lessonsOf: (skill: string) => readonly L[],
  studied: (lesson: L) => boolean,
): L[] {
  return [...new Set(skills.flatMap((s) => lessonsOf(s).filter(studied)))];
}

/** Latest answer per question id. */
export function answerHistory(
  events: readonly AnswerEvent[],
): Map<string, { at: number; ok: boolean }> {
  const out = new Map<string, { at: number; ok: boolean }>();
  for (const e of events) if (e.questionId) out.set(e.questionId, { at: e.at, ok: e.ok });
  return out;
}
