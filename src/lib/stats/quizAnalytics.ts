/**
 * Quiz analytics from per-question answers (docs/04-features/stats-v2.md, section 7). Attempts
 * recorded before stage 19 have no per-question answers and are not part of it.
 */
import type { QuestionType } from '@/types/quiz';
import type { AnswerEvent } from '@/lib/learner/events';

export interface FrequentMistake {
  questionId: string;
  wrong: number;
  answers: number;
  /** Was the latest answer right? */
  fixed: boolean;
}

/** Questions answered wrong at least `min` times, most wrong first. */
export function frequentMistakes(events: readonly AnswerEvent[], min = 2): FrequentMistake[] {
  const byQ = new Map<string, FrequentMistake>();
  for (const e of events) {
    if (!e.questionId) continue;
    const m = byQ.get(e.questionId) ?? {
      questionId: e.questionId,
      wrong: 0,
      answers: 0,
      fixed: false,
    };
    byQ.set(e.questionId, {
      ...m,
      wrong: m.wrong + (e.ok ? 0 : 1),
      answers: m.answers + 1,
      fixed: e.ok,
    });
  }
  return [...byQ.values()]
    .filter((m) => m.wrong >= min)
    .sort((a, b) => b.wrong - a.wrong || a.questionId.localeCompare(b.questionId));
}

export interface SkillPair {
  a: string;
  b: string;
  /** Attempts where both skills had a wrong answer. */
  together: number;
}

/**
 * Skills that tend to be wrong in the same attempts: a hint that they get mixed up (e.g. support
 * and liquidity). At least `min` shared attempts, most frequent first.
 */
export function confusedSkills(events: readonly AnswerEvent[], min = 2): SkillPair[] {
  const wrongBySession = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.ok || !e.questionId) continue;
    const key = `${e.quizId}@${e.at}`;
    const set = wrongBySession.get(key) ?? new Set<string>();
    for (const s of e.skills) set.add(s);
    wrongBySession.set(key, set);
  }
  const pairs = new Map<string, SkillPair>();
  for (const skills of wrongBySession.values()) {
    const list = [...skills].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] ?? '';
        const b = list[j] ?? '';
        const key = `${a}|${b}`;
        const p = pairs.get(key) ?? { a, b, together: 0 };
        pairs.set(key, { ...p, together: p.together + 1 });
      }
    }
  }
  return [...pairs.values()]
    .filter((p) => p.together >= min)
    .sort((x, y) => y.together - x.together || `${x.a}|${x.b}`.localeCompare(`${y.a}|${y.b}`));
}

/** An answer this fast and wrong was likely a guess or a misread. */
export const RUSHED_SEC = 3;

export interface TimingRow {
  type: QuestionType;
  answers: number;
  medianSec: number;
}

export interface Timing {
  byType: TimingRow[];
  /** Wrong answers given in under RUSHED_SEC seconds. */
  rushedWrong: number;
  timed: number;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};

export function answerTiming(events: readonly AnswerEvent[]): Timing {
  const timed = events.filter((e) => e.sec !== undefined);
  const byType = new Map<QuestionType, number[]>();
  for (const e of timed) {
    if (!e.type || e.sec === undefined) continue;
    byType.set(e.type, [...(byType.get(e.type) ?? []), e.sec]);
  }
  return {
    byType: [...byType.entries()]
      .map(([type, secs]) => ({ type, answers: secs.length, medianSec: median(secs) }))
      .sort((a, b) => b.answers - a.answers),
    rushedWrong: timed.filter((e) => !e.ok && (e.sec ?? Infinity) < RUSHED_SEC).length,
    timed: timed.length,
  };
}

/** Lesson of a lesson-quiz question («m03-l01-q4» → «m03-l01»); exam questions have none. */
export function lessonOfQuestion(questionId: string): string | null {
  return /^(m\d+-l\d+)-q\d+$/.exec(questionId)?.[1] ?? null;
}
