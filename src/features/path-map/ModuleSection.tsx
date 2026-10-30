import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moduleColors } from '@/components/ui/moduleColors';
import { ModuleIcon } from '@/components/ui/ModuleIcon';
import { cardClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import {
  isModuleFinished,
  isModuleUnlocked,
  lessonStatus,
  moduleCompletion,
  starsForScore,
  type UnlockContext,
} from '@/lib/progress/unlock';
import type { CourseModule, LessonId } from '@/types/course';
import type { LessonProgress } from '@/types/progress';
import { ExamRow, LessonRow } from './CourseRows';

interface ModuleSectionProps {
  module: CourseModule;
  ctx: UnlockContext;
  lessons: Partial<Record<LessonId, LessonProgress>>;
  currentLessonId?: LessonId;
  currentRef: (el: HTMLLIElement | null) => void;
}

/** One module of the course map: header with progress and a list of lessons and the exam. */
export function ModuleSection({
  module,
  ctx,
  lessons,
  currentLessonId,
  currentRef,
}: ModuleSectionProps) {
  const unlocked = isModuleUnlocked(ctx, module.id);
  const finished = isModuleFinished(ctx, module);
  const { done, total, ratio } = moduleCompletion(ctx, module);
  const hasCurrent = module.lessons.some((l) => l.id === currentLessonId);
  // Modules in progress are open; finished and closed ones are collapsed to their header.
  const [expanded, setExpanded] = useState(hasCurrent || (unlocked && !finished));
  const listId = `module-${module.id}-lessons`;

  return (
    <section
      aria-labelledby={`module-${module.id}`}
      className={cn(cardClass({ padding: 'none' }), 'overflow-hidden')}
    >
      <div className="flex items-center gap-4 p-4 md:px-5">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-(--radius-btn) border border-border bg-surface-2',
            unlocked ? moduleColors[module.color].text : 'text-text-muted',
          )}
        >
          {unlocked ? (
            <ModuleIcon name={module.icon} className="size-5" />
          ) : (
            <Lock className="size-4" aria-hidden="true" />
          )}
        </span>
        <Link to={paths.module(module.id)} className="group min-w-0 flex-1">
          <span className="block font-mono text-xs text-text-muted">
            Модуль {String(module.index).padStart(2, '0')}
          </span>
          <span
            id={`module-${module.id}`}
            className="block truncate font-semibold group-hover:underline"
          >
            {module.title}
          </span>
        </Link>
        <span className="hidden w-32 flex-col items-end gap-1.5 sm:flex">
          <span
            className={cn(
              'font-mono text-xs tabular-nums',
              finished ? 'text-bull' : 'text-text-muted',
            )}
          >
            {finished ? 'пройден' : `${done} / ${total}`}
          </span>
          <span className="h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${(finished ? 1 : ratio) * 100}%` }}
            />
          </span>
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={`Уроки модуля ${module.index}`}
          onClick={() => setExpanded((v) => !v)}
          className="grid size-9 shrink-0 place-items-center rounded-(--radius-btn) text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronDown
            className={cn('size-4 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <ol id={listId} className="border-t border-border py-1" aria-label={module.title}>
          {module.lessons.map((lesson) => {
            const status = lessonStatus(ctx, lesson.id);
            const isCurrent = lesson.id === currentLessonId;
            return (
              <LessonRow
                key={lesson.id}
                ref={isCurrent ? currentRef : undefined}
                lesson={lesson}
                moduleIndex={module.index}
                status={status}
                stars={starsForScore(lessons[lesson.id]?.quizBest ?? 0, status === 'completed')}
                isCurrent={isCurrent}
              />
            );
          })}
          {module.hasExam && <ExamRow module={module} ctx={ctx} />}
        </ol>
      )}
    </section>
  );
}
