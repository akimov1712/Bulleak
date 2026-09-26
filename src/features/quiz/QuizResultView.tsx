import { useEffect, type ReactNode } from 'react';
import type { PreparedQuestion } from '@/lib/quiz/prepare';
import type { QuizResult } from '@/types/quiz';
import { correctAnswerText } from '@/lib/quiz/describe';
import { starsForScore } from '@/lib/progress/unlock';
import { formatPct, plural } from '@/lib/format';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Stars } from '@/components/ui/Stars';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti } from '@/features/gamification/effects';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface QuizResultViewProps {
  result: QuizResult;
  questions: PreparedQuestion[];
  /** Pass threshold, for the "need X%" message. */
  passRatio: number;
  /** Action buttons (retake, next lesson, …) provided by the page. */
  actions: ReactNode;
  /** Extra line under the verdict (e.g. best score). */
  note?: ReactNode;
  /** Wording: lesson test (default) or module exam. */
  kind?: 'lesson' | 'exam';
}

export function QuizResultView({
  result,
  questions,
  passRatio,
  actions,
  note,
  kind = 'lesson',
}: QuizResultViewProps) {
  const exam = kind === 'exam';
  const stars = starsForScore(result.ratio, result.passed);
  const reduced = useReducedMotion();
  // Celebrate once when the result appears; intensity follows the stars.
  useEffect(() => {
    if (stars > 0) fireConfetti(stars === 3 ? 'big' : stars === 2 ? 'medium' : 'small', !reduced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);
  const mistakes = questions.filter((q) => !result.perQuestion.find((p) => p.id === q.id)?.correct);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
      <Mascot mood={result.passed ? 'cheering' : 'sad'} size={150} />
      <h1 className="text-3xl font-extrabold">
        {result.passed
          ? stars === 3
            ? 'Идеально!'
            : exam
              ? 'Экзамен сдан!'
              : 'Тест сдан!'
          : 'Почти получилось'}
      </h1>
      <ProgressRing
        label={exam ? 'Результат экзамена' : 'Результат теста'}
        value={result.ratio}
        size={140}
        thickness={14}
        tone={result.passed ? 'primary' : 'bear'}
      >
        <span className="flex flex-col items-center">
          <span className="font-mono text-3xl font-extrabold">{formatPct(result.ratio, 0)}</span>
          <span className="text-xs font-bold text-text-muted">
            {result.correct} из {result.total}
          </span>
        </span>
      </ProgressRing>
      {result.passed && <Stars count={stars} />}
      <p className="text-lg text-text-muted">
        {result.passed
          ? mistakes.length === 0
            ? 'Ни одной ошибки — так держать!'
            : `Ошибок: ${mistakes.length}. Разбор — ниже.`
          : exam
            ? `Для сдачи нужно ${formatPct(passRatio, 0)}. Повтори уроки с ошибками — они ниже — и попробуй снова.`
            : `Для сдачи нужно ${formatPct(passRatio, 0)}. Посмотри разбор ошибок, повтори урок и попробуй снова.`}
      </p>
      {note}
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>

      {mistakes.length > 0 && (
        <section className="mt-6 w-full text-left" aria-label="Разбор ошибок">
          <h2 className="mb-3 text-xl font-extrabold">
            Разбор: {mistakes.length} {plural(mistakes.length, ['ошибка', 'ошибки', 'ошибок'])}
          </h2>
          <ol className="flex flex-col gap-3">
            {mistakes.map((q) => (
              <li key={q.id} className="rounded-2xl border-2 border-bear/50 bg-surface p-4">
                <p className="font-extrabold">{q.prompt}</p>
                <p className="mt-2 text-sm">
                  <span className="font-bold text-bull">Правильно: </span>
                  {correctAnswerText(q)}
                </p>
                <p className="mt-1 text-sm text-text-muted">{q.explanation}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
