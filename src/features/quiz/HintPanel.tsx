import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getTerm } from '@/content/glossary';
import { courseIndex } from '@/content/courseIndex';
import { hintTermId, nextHintLevel, type HintLevel } from '@/lib/hints/ladder';
import type { Question } from '@/types/quiz';

const NEXT_LABEL: Record<HintLevel, string> = {
  1: 'Подсказка: убрать лишние варианты',
  2: 'Подсказка: напомнить правило',
  3: 'Подсказка: разбор',
};

/** Hint ladder under a lesson-test question: nudge → rule → walkthrough (hints.md, section 1). */
export function HintPanel({
  question,
  level,
  onNext,
}: {
  question: Question;
  level: HintLevel | undefined;
  onNext: () => void;
}) {
  const next = nextHintLevel(question, level);
  const term = getTerm(hintTermId(question) ?? '');
  const lesson = term ? courseIndex.getLesson(term.lessonId) : undefined;
  return (
    <div className="flex flex-col gap-2" aria-label="Подсказки" role="region">
      {level !== undefined &&
        level >= 1 &&
        (question.type === 'single' || question.type === 'multi') && (
          <p className="text-sm text-text-muted">Лишние варианты убраны.</p>
        )}
      {level !== undefined && level >= 2 && term && (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p>
            <b>{term.term}</b> — {term.short}
          </p>
          {lesson && <p className="mt-1 text-text-muted">Урок: «{lesson.title}»</p>}
        </div>
      )}
      {level === 3 && (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p>{question.explanation}</p>
          <p className="mt-1 text-text-muted">После разбора ответ не засчитывается как свой.</p>
        </div>
      )}
      {next !== null && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          leftIcon={<Lightbulb className="size-4" aria-hidden="true" />}
          onClick={onNext}
        >
          {NEXT_LABEL[next]}
        </Button>
      )}
      {level === undefined && (
        <p className="text-xs text-text-muted">
          Подсказка честно отмечается: после «правила» не будет бонуса за тест без ошибок.
        </p>
      )}
    </div>
  );
}
