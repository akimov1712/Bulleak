/**
 * Learning events: what the learner model reads (docs/04-features/learner-model.md, section 3).
 * Not stored separately — derived from quiz attempts (progress) and simulator trades.
 */
import type { QuizAttempt } from '@/types/progress';
import type { Confidence, QuestionType } from '@/types/quiz';
import type { SimTrade } from '@/types/trading';

export interface AnswerEvent {
  kind: 'answer';
  at: number;
  quizId: string;
  /** Absent for attempts recorded before per-question answers (rebuilt from the tag summary). */
  questionId?: string;
  ok: boolean;
  skills: string[];
  type?: QuestionType;
  sec?: number;
  conf?: Confidence;
}

export interface TradeEvent {
  kind: 'trade';
  at: number;
  trade: SimTrade;
}

export type LearningEvent = AnswerEvent | TradeEvent;

export type SkillsOfTags = (tags: readonly string[]) => string[];

/**
 * An old attempt only has «tag → [correct, total]». Per skill, the tag with the most answers
 * stands for it (tags of one skill often share a question, so their counts are not summed),
 * and its correct answers are spread evenly among the wrong ones.
 */
function fromSummary(attempt: QuizAttempt, skillsOfTags: SkillsOfTags): AnswerEvent[] {
  const best = new Map<string, [number, number]>();
  for (const [tag, [ok, total]] of Object.entries(attempt.tags)) {
    for (const skill of skillsOfTags([tag])) {
      const seen = best.get(skill);
      if (!seen || total > seen[1] || (total === seen[1] && ok > seen[0]))
        best.set(skill, [ok, total]);
    }
  }
  const events: AnswerEvent[] = [];
  for (const [skill, [ok, total]] of best) {
    const correct = Math.min(Math.max(0, Math.round(ok)), Math.round(total));
    for (let i = 0; i < total; i++) {
      events.push({
        kind: 'answer',
        at: attempt.at,
        quizId: attempt.quizId,
        ok: Math.floor(((i + 1) * correct) / total) > Math.floor((i * correct) / total),
        skills: [skill],
      });
    }
  }
  return events;
}

/** Answers of all attempts, oldest first. */
export function answerEvents(
  attempts: readonly QuizAttempt[],
  skillsOfTags: SkillsOfTags,
): AnswerEvent[] {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  return sorted.flatMap((attempt) =>
    attempt.answers
      ? attempt.answers.map((a) => ({
          kind: 'answer' as const,
          at: attempt.at,
          quizId: attempt.quizId,
          questionId: a.q,
          ok: a.ok,
          skills: skillsOfTags(a.tags),
          ...(a.type !== undefined && { type: a.type }),
          ...(a.sec !== undefined && { sec: a.sec }),
          ...(a.conf !== undefined && { conf: a.conf }),
        }))
      : fromSummary(attempt, skillsOfTags),
  );
}

/**
 * The learner's own simulator trades, oldest first. Strategy backtests are left out: there the
 * strategy sets the rules, not the learner. Deleted records are left out too.
 */
export function tradeEvents(trades: readonly SimTrade[]): TradeEvent[] {
  return trades
    .filter((t) => !t.deleted && !t.strategyTag)
    .sort((a, b) => a.at - b.at)
    .map((trade) => ({ kind: 'trade', at: trade.at, trade }));
}

/** Answers and trades in time order (answers first within the same millisecond). */
export function learningEvents(
  attempts: readonly QuizAttempt[],
  trades: readonly SimTrade[],
  skillsOfTags: SkillsOfTags,
): LearningEvent[] {
  const all: LearningEvent[] = [...answerEvents(attempts, skillsOfTags), ...tradeEvents(trades)];
  return all.sort((a, b) => a.at - b.at || (a.kind === b.kind ? 0 : a.kind === 'answer' ? -1 : 1));
}
