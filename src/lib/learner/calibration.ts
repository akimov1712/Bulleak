/** Answer confidence: calibration and misconceptions (docs/04-features/learner-model.md, section 8). */
import type { Confidence } from '@/types/quiz';
import type { AnswerEvent } from './events';

export const CONFIDENCE_LEVELS: readonly { id: Confidence; label: string }[] = [
  { id: 'sure', label: 'Уверен' },
  { id: 'unsure', label: 'Сомневаюсь' },
  { id: 'guess', label: 'Угадываю' },
];

export type Calibration = Record<Confidence, { answers: number; correct: number }>;

/** Right answers per confidence mark: a calibrated learner is right more often when sure. */
export function calibration(events: readonly AnswerEvent[]): Calibration {
  const out: Calibration = {
    sure: { answers: 0, correct: 0 },
    unsure: { answers: 0, correct: 0 },
    guess: { answers: 0, correct: 0 },
  };
  for (const e of events) {
    if (!e.conf) continue;
    out[e.conf].answers += 1;
    out[e.conf].correct += e.ok ? 1 : 0;
  }
  return out;
}

/**
 * Skills with a misconception: the last confident answer on the skill was wrong and no right
 * answer on it came later. `events` oldest first.
 */
export function misconceptions(events: readonly AnswerEvent[]): Set<string> {
  const open = new Set<string>();
  for (const e of events) {
    for (const skill of e.skills) {
      if (e.ok) open.delete(skill);
      else if (e.conf === 'sure') open.add(skill);
    }
  }
  return open;
}
