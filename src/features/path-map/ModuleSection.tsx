import { Link } from 'react-router';
import { Lock, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moduleColors } from '@/components/ui/moduleColors';
import { ModuleIcon } from '@/components/ui/ModuleIcon';
import { Mascot } from '@/components/mascot/Mascot';
import { paths } from '@/app/paths';
import { toast } from '@/store/uiStore';
import {
  isExamAvailable,
  isExamPassed,
  isModuleUnlocked,
  lessonStatus,
  moduleCompletion,
  starsForScore,
  type UnlockContext,
} from '@/lib/progress/unlock';
import type { CourseModule, LessonId } from '@/types/course';
import type { LessonProgress } from '@/types/progress';
import { COLUMN_WIDTH, NODE_SIZE, nodePoints, pathThrough, ROW_HEIGHT } from './layout';
import { PathNode } from './PathNode';

interface ModuleSectionProps {
  module: CourseModule;
  ctx: UnlockContext;
  lessons: Partial<Record<LessonId, LessonProgress>>;
  currentLessonId?: LessonId;
  currentRef: (el: HTMLDivElement | null) => void;
}

const EXAM_SIZE = 88;

export function ModuleSection({
  module,
  ctx,
  lessons,
  currentLessonId,
  currentRef,
}: ModuleSectionProps) {
  const colors = moduleColors[module.color];
  const unlocked = isModuleUnlocked(ctx, module.id);
  const { done, total } = moduleCompletion(ctx, module);
  const points = nodePoints(module.lessons.length + (module.hasExam ? 1 : 0));
  const height = (points.at(-1)?.y ?? 0) + EXAM_SIZE / 2 + 32;
  const examPoint = module.hasExam ? points.at(-1) : undefined;
  const examOpen = isExamAvailable(ctx, module.id);
  const examPassed = isExamPassed(ctx, module.id);

  return (
    <section aria-labelledby={`module-${module.id}`} className="flex flex-col items-center gap-6">
      <Link
        to={paths.module(module.id)}
        className={cn(
          'flex w-full items-center gap-4 rounded-(--radius-card) p-4 text-on-mod transition-transform hover:-translate-y-0.5 md:p-5',
          unlocked
            ? cn(colors.bg, colors.shadow)
            : 'bg-surface-2 text-text-muted shadow-[0_4px_0_0_var(--border)]',
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/30">
          {unlocked ? (
            <ModuleIcon name={module.icon} className="size-7" />
          ) : (
            <Lock className="size-6" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold tracking-wide uppercase">
            Модуль {module.index}
          </span>
          <span id={`module-${module.id}`} className="block text-xl leading-tight font-extrabold">
            {module.title}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/30 px-3 py-1 font-mono text-sm font-extrabold">
          {done}/{total}
        </span>
      </Link>

      <div className="relative" style={{ width: COLUMN_WIDTH, height }}>
        <svg className="absolute inset-0" width={COLUMN_WIDTH} height={height} aria-hidden="true">
          <path
            d={pathThrough(points)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray="2 16"
          />
        </svg>

        {module.lessons.map((lesson, i) => {
          const point = points[i];
          if (!point) return null;
          const status = lessonStatus(ctx, lesson.id);
          const lp = lessons[lesson.id];
          const isCurrent = lesson.id === currentLessonId;
          return (
            <PathNode
              key={lesson.id}
              ref={isCurrent ? currentRef : undefined}
              lesson={lesson}
              moduleIndex={module.index}
              status={status}
              stars={starsForScore(lp?.quizBest ?? 0, status === 'completed')}
              color={module.color}
              isCurrent={isCurrent}
              x={point.x}
              y={point.y}
            />
          );
        })}

        {currentLessonId &&
          module.lessons.some((l) => l.id === currentLessonId) &&
          (() => {
            const i = module.lessons.findIndex((l) => l.id === currentLessonId);
            const point = points[i];
            if (!point) return null;
            const onLeft = point.x > COLUMN_WIDTH / 2;
            return (
              <div
                className="pointer-events-none absolute"
                style={{
                  top: point.y - 40,
                  left: onLeft ? point.x - NODE_SIZE / 2 - 96 : point.x + NODE_SIZE / 2 + 12,
                }}
              >
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-xl border-2 border-border bg-surface px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-bull shadow-[0_3px_0_0_var(--border)]">
                  {lessonStatus(ctx, currentLessonId) === 'read' ? 'К тесту!' : 'Начнём?'}
                </span>
                <Mascot mood="pointing" size={84} className={onLeft ? '' : '-scale-x-100'} />
              </div>
            );
          })()}

        {examPoint && (
          <div
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: examPoint.x - EXAM_SIZE / 2,
              top: examPoint.y - EXAM_SIZE / 2 + ROW_HEIGHT * 0.1,
              width: EXAM_SIZE,
            }}
          >
            {examOpen || examPassed ? (
              <Link
                to={paths.exam(module.id)}
                aria-label={`Экзамен модуля ${module.index}${examPassed ? ' (сдан)' : ''}`}
                className={cn(
                  'grid place-items-center rounded-3xl border-4 transition-transform active:translate-y-1',
                  examPassed
                    ? 'border-xp-shade bg-xp text-on-xp shadow-[0_6px_0_0_var(--xp-shade)]'
                    : 'border-xp bg-surface text-xp-shade shadow-[0_6px_0_0_var(--xp-shade)] motion-safe:animate-[node-bounce_2s_ease-in-out_infinite]',
                )}
                style={{ width: EXAM_SIZE, height: EXAM_SIZE }}
              >
                <Trophy
                  className={cn('size-10', examPassed && 'fill-current')}
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Экзамен модуля ${module.index} (закрыт)`}
                onClick={() =>
                  toast({
                    tone: 'info',
                    icon: '🏆',
                    title: 'Экзамен пока закрыт',
                    description: 'Он откроется после всех уроков модуля.',
                  })
                }
                className="grid place-items-center rounded-3xl border-4 border-border bg-surface-2 text-text-muted shadow-[0_6px_0_0_var(--border)]"
                style={{ width: EXAM_SIZE, height: EXAM_SIZE }}
              >
                <Trophy className="size-10" aria-hidden="true" />
              </button>
            )}
            <span className="text-xs font-extrabold text-text-muted">Экзамен</span>
          </div>
        )}
      </div>
    </section>
  );
}
