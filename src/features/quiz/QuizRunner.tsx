import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { PreparedQuiz } from '@/lib/quiz/prepare';
import type { QuizResult } from '@/types/quiz';
import { gradeQuestion, gradeQuiz } from '@/lib/quiz/grade';
import { correctAnswerText, initialAnswer, isAnswered, questionHint } from '@/lib/quiz/describe';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { FeedbackPanel } from './FeedbackPanel';
import { QuestionView } from './QuestionView';

export type QuizMode = 'lesson' | 'exam';

export interface QuizFinish {
  result: QuizResult;
  answers: Record<string, unknown>;
  durationSec: number;
}

interface QuizRunnerProps {
  prepared: PreparedQuiz;
  /** lesson: feedback after each answer; exam: explanations only at the end. */
  mode: QuizMode;
  title: string;
  onFinish: (finish: QuizFinish) => void;
  onExit: () => void;
}

export function QuizRunner({ prepared, mode, title, onFinish, onExit }: QuizRunnerProps) {
  const { questions } = prepared;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, initialAnswer(q)])),
  );
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const [startedAt] = useState(() => performance.now());

  const question = questions[index];
  if (!question) return null;
  const value = answers[question.id];
  const verdict = verdicts[question.id];
  const checked = verdict !== undefined;
  const isLast = index === questions.length - 1;

  function finish(finalAnswers: Record<string, unknown>) {
    onFinish({
      result: gradeQuiz(prepared.quiz.id, questions, finalAnswers, prepared.quiz.passRatio),
      answers: finalAnswers,
      durationSec: Math.round((performance.now() - startedAt) / 1000),
    });
  }

  function next() {
    if (isLast) finish(answers);
    else setIndex(index + 1);
  }

  function check(event?: FormEvent) {
    event?.preventDefault();
    if (!question || checked || !isAnswered(question, value)) return;
    setVerdicts({ ...verdicts, [question.id]: gradeQuestion(question, value) });
    if (mode === 'exam') next();
  }

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="mb-6 flex items-center gap-3">
        <IconButton
          label="Выйти из теста"
          icon={<X className="size-6" />}
          onClick={() => setConfirmExit(true)}
        />
        <ol className="flex flex-1 gap-1" aria-label={`Вопрос ${index + 1} из ${questions.length}`}>
          {questions.map((q, i) => {
            const v = verdicts[q.id];
            return (
              <li
                key={q.id}
                className={cn(
                  'h-3 flex-1 rounded-full transition-colors',
                  v === undefined
                    ? i === index
                      ? 'bg-info'
                      : 'bg-surface-2'
                    : mode === 'exam'
                      ? 'bg-text-muted/50'
                      : v
                        ? 'bg-bull'
                        : 'bg-bear',
                )}
              />
            );
          })}
        </ol>
        <span className="font-mono text-sm font-bold text-text-muted tabular-nums">
          {index + 1}/{questions.length}
        </span>
      </div>

      <form onSubmit={check} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5">
        <div>
          <p className="mb-1 text-sm font-extrabold tracking-wide text-text-muted uppercase">
            {title} · {questionHint(question)}
          </p>
          <h1 className="text-2xl leading-snug font-extrabold md:text-[1.75rem]">
            {question.prompt}
          </h1>
          {question.image && (
            <img
              src={`${import.meta.env.BASE_URL}${question.image.replace(/^\//, '')}`}
              alt=""
              className="mt-4 w-full rounded-2xl border-2 border-border"
            />
          )}
        </div>

        <QuestionView
          key={question.id}
          question={question}
          value={value}
          onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          state={!checked || mode === 'exam' ? 'answering' : verdict ? 'correct' : 'wrong'}
        />

        {!checked && (
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-auto pt-4 lg:bottom-4">
            <Button type="submit" size="lg" fullWidth disabled={!isAnswered(question, value)}>
              {mode === 'exam' ? (isLast ? 'Завершить экзамен' : 'Ответить') : 'Проверить'}
            </Button>
          </div>
        )}
      </form>

      {checked && mode === 'lesson' && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-6 -mx-4 md:mx-auto md:w-full md:max-w-2xl lg:bottom-4">
          <FeedbackPanel
            correct={verdict}
            correctAnswer={correctAnswerText(question)}
            explanation={question.explanation}
            isLast={isLast}
            onNext={next}
          />
        </div>
      )}

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Выйти из теста?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmExit(false)}>
              Продолжить
            </Button>
            <Button variant="danger" onClick={onExit}>
              Выйти
            </Button>
          </>
        }
      >
        <p className="text-text-muted">Эта попытка не сохранится — начать можно будет заново.</p>
      </Modal>
    </div>
  );
}
