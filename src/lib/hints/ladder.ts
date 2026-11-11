/**
 * Hint ladder in tests (docs/04-features/hints.md, section 1): a nudge, then the rule, then the
 * walkthrough. The answer itself is never shown before checking.
 */
import type { Question } from '@/types/quiz';

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
 * more than the right ones (multi). The kept wrong option is the first in the question's own
 * order, so the nudge does not depend on the shuffled display.
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
