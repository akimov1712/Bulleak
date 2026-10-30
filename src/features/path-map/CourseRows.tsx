import { forwardRef } from 'react';
import { Link } from 'react-router';
import { Check, ClipboardCheck, Lock, Play, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPct } from '@/lib/format';
import { Stars } from '@/components/ui/Stars';
import { toast } from '@/store/uiStore';
import { paths } from '@/app/paths';
import { isExamAvailable, isExamPassed, type UnlockContext } from '@/lib/progress/unlock';
import type { CourseModule, LessonMeta } from '@/types/course';
import type { LessonStatus } from '@/types/progress';

/*
 * Rows of the course syllabus (map and module page): one per lesson, plus the module exam.
 * Same grid everywhere: status icon · number and title · meta on the right.
 */

const row =
  'grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors md:px-5';

function StatusIcon({ status }: { status: LessonStatus }) {
  const box = 'grid size-8 shrink-0 place-items-center rounded-full';
  if (status === 'completed')
    return (
      <span className={cn(box, 'bg-bull-soft text-bull')}>
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  if (status === 'read')
    return (
      <span className={cn(box, 'border border-info text-info')}>
        <ClipboardCheck className="size-4" aria-hidden="true" />
      </span>
    );
  if (status === 'available')
    return (
      <span className={cn(box, 'bg-primary text-on-primary')}>
        <Play className="size-3.5 fill-current" aria-hidden="true" />
      </span>
    );
  return (
    <span className={cn(box, 'bg-surface-2 text-text-muted')}>
      <Lock className="size-3.5" aria-hidden="true" />
    </span>
  );
}

interface LessonRowProps {
  lesson: LessonMeta;
  moduleIndex: number;
  status: LessonStatus;
  stars: 0 | 1 | 2 | 3;
  /** The next lesson of the course: highlighted with a label. */
  isCurrent?: boolean;
  /** Show the one-line summary under the title (module page). */
  withSummary?: boolean;
}

export const LessonRow = forwardRef<HTMLLIElement, LessonRowProps>(function LessonRow(
  { lesson, moduleIndex, status, stars, isCurrent = false, withSummary = false },
  ref,
) {
  const number = `${moduleIndex}.${lesson.index}`;
  const label = `Урок ${number}: ${lesson.title}`;
  const locked = status === 'locked';
  const content = (
    <>
      <StatusIcon status={status} />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs text-text-muted tabular-nums">{number}</span>
          <span className={cn('truncate text-sm', isCurrent ? 'font-semibold' : 'font-medium')}>
            {lesson.title}
          </span>
        </span>
        {withSummary && (
          <span className="mt-0.5 line-clamp-2 text-sm text-text-muted">{lesson.summary}</span>
        )}
      </span>
      <span className="flex items-center gap-3">
        {isCurrent && !locked && (
          <span className="rounded-full bg-bull-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-bull max-sm:hidden">
            {status === 'read' ? 'Остался тест' : 'Следующий урок'}
          </span>
        )}
        {status === 'completed' && <Stars count={stars} size="size-3.5" className="gap-0.5" />}
        <span className="w-12 text-right font-mono text-xs text-text-muted tabular-nums max-sm:hidden">
          {lesson.minutes} мин
        </span>
      </span>
    </>
  );

  return (
    <li
      ref={ref}
      className={cn(
        'relative',
        isCurrent &&
          !locked &&
          'bg-surface-2 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
      )}
    >
      {locked ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} (закрыт)`}
          className={cn(row, 'text-text-muted')}
          onClick={() =>
            toast({
              tone: 'info',
              icon: '🔒',
              title: 'Урок пока закрыт',
              description: 'Сначала пройди предыдущие уроки.',
            })
          }
        >
          {content}
        </button>
      ) : (
        <Link
          to={status === 'read' ? paths.lessonQuiz(lesson.id) : paths.lesson(lesson.id)}
          aria-label={label}
          className={cn(row, 'hover:bg-surface-2')}
        >
          {content}
        </Link>
      )}
    </li>
  );
});

/** Exam row at the end of a module: opens after all lessons, shows the best score once passed. */
export function ExamRow({ module, ctx }: { module: CourseModule; ctx: UnlockContext }) {
  const open = isExamAvailable(ctx, module.id);
  const passed = isExamPassed(ctx, module.id);
  const best = ctx.progress.exams[module.id]?.best ?? 0;
  const label = `Экзамен модуля ${module.index}`;
  const content = (
    <>
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          passed ? 'bg-xp text-on-xp' : open ? 'border border-xp text-xp' : 'bg-surface-2',
        )}
      >
        <Trophy className="size-4" aria-hidden="true" />
      </span>
      <span className="truncate text-sm font-medium">{label}</span>
      <span className={cn('text-xs whitespace-nowrap', passed ? 'text-bull' : 'text-text-muted')}>
        {passed ? `сдан · ${formatPct(best, 0)}` : open ? '15 вопросов · 80%' : 'после уроков'}
      </span>
    </>
  );
  return (
    <li className="border-t border-border">
      {open || passed ? (
        <Link
          to={paths.exam(module.id)}
          aria-label={`${label}${passed ? ' (сдан)' : ''}`}
          className={cn(row, 'hover:bg-surface-2')}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} (закрыт)`}
          className={cn(row, 'text-text-muted')}
          onClick={() =>
            toast({
              tone: 'info',
              icon: '🏆',
              title: 'Экзамен пока закрыт',
              description: 'Он откроется после всех уроков модуля.',
            })
          }
        >
          {content}
        </button>
      )}
    </li>
  );
}
