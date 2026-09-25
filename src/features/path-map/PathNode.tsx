import { forwardRef } from 'react';
import { Link } from 'react-router';
import { Check, ClipboardCheck, Lock, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover } from '@/components/ui/Popover';
import { Stars } from '@/components/ui/Stars';
import { buttonClass } from '@/components/ui/styles';
import { moduleColors } from '@/components/ui/moduleColors';
import { toast } from '@/store/uiStore';
import { paths } from '@/app/paths';
import type { LessonMeta, ModuleColor } from '@/types/course';
import type { LessonStatus } from '@/types/progress';
import { NODE_SIZE } from './layout';

interface PathNodeProps {
  lesson: LessonMeta;
  moduleIndex: number;
  status: LessonStatus;
  stars: 0 | 1 | 2 | 3;
  color: ModuleColor;
  isCurrent: boolean;
  x: number;
  y: number;
}

const ACTION: Record<Exclude<LessonStatus, 'locked'>, string> = {
  available: 'Начать урок',
  read: 'Пройти тест',
  completed: 'Повторить',
};

export const PathNode = forwardRef<HTMLDivElement, PathNodeProps>(function PathNode(
  { lesson, moduleIndex, status, stars, color, isCurrent, x, y },
  ref,
) {
  const colors = moduleColors[color];
  const label = `Урок ${moduleIndex}.${lesson.index}: ${lesson.title}`;
  const locked = status === 'locked';

  const circle = cn(
    'relative grid place-items-center rounded-full border-4 transition-transform active:translate-y-1',
    locked
      ? 'border-border bg-surface-2 text-text-muted shadow-[0_6px_0_0_var(--border)]'
      : cn(colors.bg, 'border-white/40 text-on-mod'),
    status === 'completed' && 'border-xp',
    isCurrent && !locked && 'motion-safe:animate-[node-bounce_2s_ease-in-out_infinite]',
  );

  const icon = locked ? (
    <Lock className="size-7" aria-hidden="true" />
  ) : status === 'completed' ? (
    <Check className="size-8" strokeWidth={3.5} aria-hidden="true" />
  ) : status === 'read' ? (
    <ClipboardCheck className="size-8" aria-hidden="true" />
  ) : (
    <Play className="size-8 fill-current" aria-hidden="true" />
  );

  return (
    <div
      ref={ref}
      className="absolute flex flex-col items-center"
      style={{ left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2, width: NODE_SIZE }}
    >
      {locked ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} (закрыт)`}
          className={circle}
          style={{ width: NODE_SIZE, height: NODE_SIZE }}
          onClick={() =>
            toast({
              tone: 'info',
              icon: '🔒',
              title: 'Урок пока закрыт',
              description: 'Сначала пройди предыдущие уроки.',
            })
          }
        >
          {icon}
        </button>
      ) : (
        <Popover
          placement="right"
          content={
            <div className="flex w-60 flex-col gap-2">
              <p className="text-xs font-extrabold tracking-wide text-text-muted uppercase">
                Урок {moduleIndex}.{lesson.index} · ~{lesson.minutes} мин
              </p>
              <p className="font-extrabold">{lesson.title}</p>
              <p className="text-text-muted">{lesson.summary}</p>
              <Link
                to={status === 'read' ? paths.lessonQuiz(lesson.id) : paths.lesson(lesson.id)}
                className={buttonClass({
                  fullWidth: true,
                  variant: status === 'completed' ? 'secondary' : 'primary',
                })}
              >
                {ACTION[status]}
              </Link>
            </div>
          }
        >
          <button
            type="button"
            aria-label={label}
            className={circle}
            style={{
              width: NODE_SIZE,
              height: NODE_SIZE,
              boxShadow: `0 6px 0 0 var(--mod-${color}-shade)`,
            }}
          >
            {icon}
          </button>
        </Popover>
      )}
      {status === 'completed' && <Stars count={stars} size="size-4" className="mt-1.5 gap-0.5" />}
    </div>
  );
});
