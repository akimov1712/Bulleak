import { Link } from 'react-router';
import { ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPct } from '@/lib/format';
import { courseIndex } from '@/content/courseIndex';
import { cardClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import {
  isModuleFinished,
  isModuleUnlocked,
  moduleCompletion,
  type UnlockContext,
} from '@/lib/progress/unlock';
import type { ModuleId } from '@/types/course';

/** All modules with their progress; the current one is highlighted, closed ones dimmed. */
export function ModulesCard({
  ctx,
  current,
  className,
}: {
  ctx: UnlockContext;
  current: ModuleId | undefined;
  className?: string;
}) {
  const modules = courseIndex.modules;
  return (
    <section
      aria-labelledby="home-modules"
      className={cn(cardClass({ padding: 'none' }), 'flex flex-col', className)}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 id="home-modules" className="font-semibold">
          Модули курса
        </h2>
        <Link
          to={paths.path()}
          className="flex min-h-11 items-center gap-0.5 text-sm font-medium text-text-muted hover:text-text"
        >
          Карта курса
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ol className="flex flex-col pb-2">
        {modules.map((m) => {
          const unlocked = isModuleUnlocked(ctx, m.id);
          const finished = isModuleFinished(ctx, m);
          const { done, total, ratio } = moduleCompletion(ctx, m);
          const exam = ctx.progress.exams[m.id];
          const isCurrent = m.id === current;
          const status = !unlocked
            ? 'закрыт'
            : finished
              ? exam?.passedAt !== undefined
                ? `экзамен ${formatPct(exam.best, 0)}`
                : 'пройден'
              : `${done} / ${total}`;
          return (
            <li key={m.id}>
              <Link
                to={paths.module(m.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-5 py-2.5 transition-colors hover:bg-surface-2 sm:grid-cols-[2rem_minmax(0,1fr)_auto_8rem]',
                  isCurrent && 'bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    isCurrent ? 'text-bull' : 'text-text-muted',
                  )}
                >
                  {String(m.index).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'truncate text-sm',
                    isCurrent && 'font-semibold',
                    !unlocked && 'text-text-muted',
                  )}
                >
                  {m.title}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs tabular-nums',
                    finished ? 'text-bull' : 'text-text-muted',
                  )}
                >
                  {!unlocked && <Lock className="size-3" aria-hidden="true" />}
                  {status}
                </span>
                <span
                  className="col-span-3 col-start-2 h-1 overflow-hidden rounded-full bg-surface-2 sm:col-span-1 sm:col-start-auto"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(finished ? 1 : ratio) * 100}%` }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
