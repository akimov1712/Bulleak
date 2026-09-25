import type { MatchQuestion, OrderQuestion, Question, Quiz } from '@/types/quiz';
import { mulberry32, shuffle, type Rng } from '@/lib/random';

/** A question ready to show: options shuffled, extra display data for match/order. */
export type PreparedQuestion =
  | Exclude<Question, MatchQuestion | OrderQuestion>
  | (MatchQuestion & { /** right-column values in display order */ rights: string[] })
  | (OrderQuestion & { /** items in the initial (shuffled) order */ shuffled: string[] });

export interface PreparedQuiz {
  quiz: Quiz;
  questions: PreparedQuestion[];
}

/** Shuffle, but never return the original order when a different one exists. */
function shuffleAway<T>(items: readonly T[], rng: Rng): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 10; attempt++) {
    const out = shuffle(items, rng);
    if (out.some((v, i) => v !== items[i])) return out;
  }
  return [...items.slice(1), items[0] as T];
}

function prepareQuestion(q: Question, rng: Rng): PreparedQuestion {
  switch (q.type) {
    case 'single':
    case 'multi':
      return { ...q, options: shuffle(q.options, rng) };
    case 'match':
      return {
        ...q,
        rights: shuffleAway(
          q.pairs.map((p) => p.right),
          rng,
        ),
      };
    case 'order':
      return { ...q, shuffled: shuffleAway(q.items, rng) };
    default:
      return q;
  }
}

/**
 * Draw `count` questions spreading picks across topics: group by first tag, then take
 * round-robin from shuffled groups so no topic dominates an exam.
 */
export function stratifiedSample(
  questions: readonly Question[],
  count: number,
  rng: Rng,
): Question[] {
  if (count >= questions.length) return [...questions];
  const groups = new Map<string, Question[]>();
  for (const q of shuffle(questions, rng)) {
    const key = q.tags[0] ?? '';
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  const queues = shuffle([...groups.values()], rng);
  const picked: Question[] = [];
  while (picked.length < count) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) picked.push(next);
      if (picked.length === count) break;
    }
  }
  return picked;
}

/** Deterministic for a given seed (tests, replaying an attempt). */
export function prepareQuiz(quiz: Quiz, seed: number): PreparedQuiz {
  const rng = mulberry32(seed);
  const pool = quiz.sample ? stratifiedSample(quiz.questions, quiz.sample, rng) : quiz.questions;
  return { quiz, questions: shuffle(pool, rng).map((q) => prepareQuestion(q, rng)) };
}
