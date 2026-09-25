import type { AnswerByType, Question, QuizResult } from '@/types/quiz';

const EPSILON = 1e-9;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  return setA.size === new Set(b).size && b.every((x) => setA.has(x)) && a.length === b.length;
}

/**
 * Is `answer` correct for `q`? Unknown/missing/mistyped answers are simply wrong.
 * Multi-select must match exactly (partial = wrong).
 */
export function gradeQuestion(q: Question, answer: unknown): boolean {
  switch (q.type) {
    case 'single':
      return answer === q.correct;
    case 'multi':
      return Array.isArray(answer) && sameSet(answer as string[], q.correct);
    case 'truefalse':
      return answer === q.correct;
    case 'numeric':
      return isFiniteNumber(answer) && Math.abs(answer - q.correct) <= q.tolerance + EPSILON;
    case 'chart-click': {
      if (typeof answer !== 'object' || answer === null) return false;
      const a = answer as Partial<{ price: number; candle: number }>;
      if (q.target.kind === 'price') {
        return isFiniteNumber(a.price) && a.price >= q.target.min && a.price <= q.target.max;
      }
      return isFiniteNumber(a.candle) && q.target.indices.includes(a.candle);
    }
    case 'match': {
      if (typeof answer !== 'object' || answer === null) return false;
      const chosen = answer as AnswerByType['match'];
      return q.pairs.every((p) => chosen[p.left] === p.right);
    }
    case 'order':
      return (
        Array.isArray(answer) &&
        answer.length === q.items.length &&
        answer.every((item, i) => item === q.items[i])
      );
  }
}

export function gradeQuiz(
  quizId: string,
  questions: readonly Question[],
  answers: Readonly<Record<string, unknown>>,
  passRatio: number,
): QuizResult {
  const perQuestion = questions.map((q) => ({
    id: q.id,
    correct: gradeQuestion(q, answers[q.id]),
    tags: q.tags,
  }));
  const correct = perQuestion.filter((p) => p.correct).length;
  const total = questions.length;
  const ratio = total === 0 ? 0 : correct / total;
  return {
    quizId,
    correct,
    total,
    ratio,
    passed: total > 0 && ratio + EPSILON >= passRatio,
    perQuestion,
  };
}
