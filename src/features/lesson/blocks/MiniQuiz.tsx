import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { Question } from '@/types/quiz';
import { prepareQuiz } from '@/lib/quiz/prepare';
import { gradeQuestion } from '@/lib/quiz/grade';
import { correctAnswerText, initialAnswer, isAnswered } from '@/lib/quiz/describe';
import { hashString } from '@/lib/random';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { QuestionView } from '@/features/quiz/QuestionView';

/** Practice question inside a lesson: instant feedback, retry, no XP. */
export function MiniQuiz({ question }: { question: Question }) {
  const titleId = useId();
  // Prepared once per mount: MDX passes a new object literal on every render.
  const [prepared] = useState(
    () =>
      prepareQuiz(
        { id: question.id, kind: 'lesson', passRatio: 1, questions: [question] },
        hashString(question.id),
      ).questions[0],
  );
  const [value, setValue] = useState<unknown>(() =>
    prepared ? initialAnswer(prepared) : undefined,
  );
  const [verdict, setVerdict] = useState<boolean | null>(null);
  if (!prepared) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="my-8 rounded-(--radius-card) border-2 border-info bg-surface p-5 shadow-[0_4px_0_0_var(--info)]"
    >
      <p className="mb-1 flex items-center gap-2 text-sm font-extrabold tracking-wide text-info uppercase">
        <HelpCircle className="size-5" aria-hidden="true" />
        Мини-проверка
      </p>
      <h3 id={titleId} className="mb-4 text-lg font-extrabold">
        {question.prompt}
      </h3>
      <QuestionView
        question={prepared}
        value={value}
        onChange={setValue}
        state={verdict === null ? 'answering' : verdict ? 'correct' : 'wrong'}
      />
      <div className="mt-4 flex flex-col gap-3">
        {verdict === null ? (
          <Button
            onClick={() => setVerdict(gradeQuestion(question, value))}
            disabled={!isAnswered(question, value)}
            className="self-start"
          >
            Проверить
          </Button>
        ) : (
          <>
            <div
              role="status"
              className={cn('rounded-2xl p-3', verdict ? 'bg-bull-soft' : 'bg-bear-soft')}
            >
              <p className={cn('font-extrabold', verdict ? 'text-bull' : 'text-bear')}>
                {verdict ? 'Верно!' : `Правильный ответ: ${correctAnswerText(question)}`}
              </p>
              <p className="mt-1 text-text-muted">{question.explanation}</p>
            </div>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => {
                setVerdict(null);
                setValue(initialAnswer(prepared));
              }}
            >
              Попробовать ещё раз
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
