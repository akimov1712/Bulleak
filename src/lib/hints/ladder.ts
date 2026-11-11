/**
 * Hint ladder in tests (docs/04-features/hints.md, section 1): a nudge, then the rule, then the
 * walkthrough. The answer itself is never shown before checking.
 */
import type { Confidence, Question, QuizResult } from '@/types/quiz';

/** 1 — nudge (fewer options), 2 — rule (term definition), 3 — walkthrough (explanation). */
export type HintLevel = 1 | 2 | 3;

const hasChoices = (q: Question) => q.type === 'single' || q.type === 'multi';

/** Levels a question offers, in order: choice questions start with the nudge. */
export function hintLevels(q: Question): HintLevel[] {
  return hasChoices(q) ? [1, 2, 3] : [2, 3];
}

/** The next level after `current` (undefined = none opened yet); null when all are open. */
export function nextHintLevel(q: Question, current: HintLevel | undefined): HintLevel | null {
  const levels = hintLevels(q);
  if (current === undefined) return levels[0] ?? null;
  return levels.find((l) => l > current) ?? null;
}

/**
 * Option ids the nudge hides: wrong options until one wrong option is left (single) or one
 * more than the right ones (multi). The kept wrong option is the first in the given order —
 * for a prepared (shuffled) question that is the first one on screen.
 */
export function nudgeHiddenOptions(q: Question): string[] {
  if (q.type !== 'single' && q.type !== 'multi') return [];
  const correct = new Set(q.type === 'single' ? [q.correct] : q.correct);
  const wrong = q.options.filter((o) => !correct.has(o.id)).map((o) => o.id);
  return wrong.slice(1);
}

/** Glossary term behind the question's first tag (for the «rule» step). */
export const hintTermId = (q: Question): string | undefined => q.tags[0];

/** Bonuses for a clean result are lost once the rule or the walkthrough was opened. */
export const HINT_BLOCKS_BONUS: HintLevel = 2;

/** The answer after the nudge: options it hid are no longer chosen. */
export function withoutHiddenOptions(q: Question, value: unknown, empty: unknown): unknown {
  const hidden = nudgeHiddenOptions(q);
  if (hidden.length === 0) return value;
  if (Array.isArray(value)) return value.filter((id) => !hidden.includes(String(id)));
  return hidden.includes(String(value)) ? empty : value;
}

/**
 * Adds hint levels and confidence marks to the graded result. An answer given after the
 * walkthrough is not the learner's own: it does not count as correct, so a test cannot be
 * passed by opening the walkthrough everywhere.
 */
export function applyHints(
  result: QuizResult,
  hints: Readonly<Record<string, HintLevel>>,
  confidence: Readonly<Record<string, Confidence>>,
  passRatio: number,
): QuizResult {
  const perQuestion = result.perQuestion.map((p) => {
    const hint = hints[p.id];
    const conf = confidence[p.id];
    return {
      ...p,
      ...(conf && { conf }),
      ...(hint && { hint }),
      correct: p.correct && hint !== 3,
    };
  });
  const correct = perQuestion.filter((p) => p.correct).length;
  const ratio = result.total === 0 ? 0 : correct / result.total;
  return {
    ...result,
    perQuestion,
    correct,
    ratio,
    passed: result.total > 0 && ratio + 1e-9 >= passRatio,
  };
}
