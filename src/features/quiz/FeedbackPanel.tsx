import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { playSound } from '@/features/gamification/effects';
import { useSettings } from '@/store/settingsStore';
import { Button } from '@/components/ui/Button';

interface FeedbackPanelProps {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  isLast: boolean;
  onNext: () => void;
}

const PRAISE = ['Отлично!', 'Верно!', 'Так держать!', 'В точку!'];

/** Bottom sheet after "Проверить": verdict, right answer, explanation, "Дальше". */
export function FeedbackPanel({
  correct,
  correctAnswer,
  explanation,
  isLast,
  onNext,
}: FeedbackPanelProps) {
  const praise = PRAISE[explanation.length % PRAISE.length];
  const nextRef = useRef<HTMLButtonElement>(null);
  // Move focus to "Дальше" so keyboard users can continue with Enter.
  useEffect(() => nextRef.current?.focus(), []);
  const sound = useSettings((s) => s.sound);
  useEffect(() => {
    playSound(correct ? 'correct' : 'wrong', sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the panel appears
  }, []);
  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        'animate-[sheet-in_200ms_ease-out] rounded-t-3xl border-t-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:rounded-3xl md:border-4 md:pb-4',
        correct ? 'border-bull bg-bull-soft' : 'border-bear bg-bear-soft',
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <p
          className={cn(
            'flex items-center gap-2 text-xl font-extrabold',
            correct ? 'text-bull' : 'text-bear',
          )}
        >
          {correct ? (
            <CheckCircle2 className="size-7" aria-hidden="true" />
          ) : (
            <XCircle className="size-7" aria-hidden="true" />
          )}
          {correct ? praise : 'Не совсем'}
        </p>
        {!correct && (
          <p>
            <span className="font-bold">Правильный ответ: </span>
            {correctAnswer}
          </p>
        )}
        {correct ? (
          <details className="text-text-muted">
            <summary className="cursor-pointer font-bold">Почему это так</summary>
            <p className="mt-1">{explanation}</p>
          </details>
        ) : (
          <p className="text-text-muted">{explanation}</p>
        )}
        <Button
          size="lg"
          variant={correct ? 'primary' : 'danger'}
          onClick={onNext}
          ref={nextRef}
          className="w-full md:w-auto md:self-end"
        >
          {isLast ? 'Результат' : 'Дальше'}
        </Button>
      </div>
    </div>
  );
}
