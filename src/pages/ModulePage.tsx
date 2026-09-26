import { Link, useParams } from 'react-router';
import { Check, ChevronRight, Clock, Lock, PlayCircle, Trophy } from 'lucide-react';
import { courseIndex } from '@/content/courseIndex';
import { cn } from '@/lib/cn';
import { formatPct, plural } from '@/lib/format';
import {
  isExamAvailable,
  isExamPassed,
  isModuleUnlocked,
  lessonStatus,
  moduleCompletion,
  starsForScore,
} from '@/lib/progress/unlock';
import { moduleColors } from '@/components/ui/moduleColors';
import { ModuleIcon } from '@/components/ui/ModuleIcon';
import { ModuleCover } from '@/components/covers/ModuleCover';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { Stars } from '@/components/ui/Stars';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';

export function ModulePage() {
  const { moduleId = '' } = useParams();
  const module = courseIndex.getModule(moduleId);
  usePageTitle(module ? `Модуль ${module.index}. ${module.title}` : 'Модуль');
  const ctx = useUnlockContext();
  const lessonsProgress = useProgress((s) => s.lessons);
  const exams = useProgress((s) => s.exams);

  if (!module) {
    return (
      <EmptyState
        art={<Mascot mood="shocked" size={130} />}
        title="Модуль не найден"
        action={
          <Link to={paths.path()} className={buttonClass()}>
            К карте курса
          </Link>
        }
      />
    );
  }

  const colors = moduleColors[module.color];
  const unlocked = isModuleUnlocked(ctx, module.id);
  const completion = moduleCompletion(ctx, module);
  const previous = courseIndex.modules[module.index - 1];
  const examProgress = exams[module.id];
  const examOpen = isExamAvailable(ctx, module.id);
  const examPassed = isExamPassed(ctx, module.id);
  const minutes = module.lessons.reduce((sum, l) => sum + l.minutes, 0);

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Хлебные крошки"
        className="flex items-center gap-1 text-sm font-bold text-text-muted"
      >
        <Link to={paths.path()} className="hover:text-text">
          Карта курса
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span>Модуль {module.index}</span>
      </nav>

      <header
        className={cn('rounded-(--radius-card) p-5 text-on-mod md:p-7', colors.bg, colors.shadow)}
      >
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/30">
            <ModuleIcon name={module.icon} className="size-8" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-wide uppercase">Модуль {module.index}</p>
            <h1 className="text-3xl leading-tight font-extrabold md:text-4xl">{module.title}</h1>
          </div>
          <ModuleCover moduleId={module.id} className="ml-auto w-24 sm:w-36 md:w-44" />
        </div>
      </header>

      <p className="text-lg text-text-muted">{module.description}</p>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm font-bold text-text-muted">
          <span>
            {completion.done} из {completion.total}{' '}
            {plural(completion.total, ['урока', 'уроков', 'уроков'])} пройдено
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-4" aria-hidden="true" />~{minutes} мин
          </span>
        </div>
        <ProgressBar
          label="Прогресс модуля"
          value={completion.ratio}
          valueText={`${completion.done} из ${completion.total}`}
        />
      </div>

      {!unlocked && previous && (
        <p className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-text-muted">
          <Lock className="size-5 shrink-0" aria-hidden="true" />
          Модуль откроется после {previous.hasExam ? 'экзамена' : 'прохождения'} модуля{' '}
          {previous.index} «{previous.title}».
        </p>
      )}

      <ol className="flex flex-col gap-3" aria-label="Уроки модуля">
        {module.lessons.map((lesson) => {
          const status = lessonStatus(ctx, lesson.id);
          const lp = lessonsProgress[lesson.id];
          const stars = starsForScore(lp?.quizBest ?? 0, status === 'completed');
          const body = (
            <>
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-full border-2',
                  status === 'completed' && 'border-bull bg-bull text-bull-soft',
                  (status === 'available' || status === 'read') &&
                    cn(colors.bg, 'border-transparent text-on-mod'),
                  status === 'locked' && 'border-border bg-surface-2 text-text-muted',
                )}
              >
                {status === 'completed' ? (
                  <Check className="size-5" strokeWidth={2.8} aria-hidden="true" />
                ) : status === 'locked' ? (
                  <Lock className="size-5" strokeWidth={2.8} aria-hidden="true" />
                ) : (
                  <PlayCircle className="size-5" strokeWidth={2.8} aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold tracking-wide text-text-muted uppercase">
                  Урок {module.index}.{lesson.index} · ~{lesson.minutes} мин
                  {status === 'read' && ' · остался тест'}
                </span>
                <span className="block font-extrabold">{lesson.title}</span>
                <span className="mt-0.5 block text-sm text-text-muted">{lesson.summary}</span>
              </span>
              {status === 'completed' && <Stars count={stars} size="size-5" />}
            </>
          );
          return (
            <li key={lesson.id}>
              {status === 'locked' ? (
                <div
                  aria-disabled="true"
                  className="flex items-center gap-4 rounded-2xl border-2 border-border p-4 opacity-60"
                >
                  {body}
                  <span className="sr-only">(закрыт)</span>
                </div>
              ) : (
                <Link
                  to={paths.lesson(lesson.id)}
                  className="flex items-center gap-4 rounded-2xl border-2 border-border bg-surface p-4 shadow-[0_3px_0_0_var(--border)] transition-transform hover:-translate-y-0.5"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {module.hasExam && (
        <section
          aria-label="Экзамен модуля"
          className={cn(
            'flex flex-col gap-4 rounded-(--radius-card) border-2 p-5 sm:flex-row sm:items-center',
            examPassed ? 'border-xp bg-surface' : 'border-dashed border-border',
          )}
        >
          <Trophy
            className={cn(
              'size-12 shrink-0',
              examPassed ? 'fill-xp text-xp-shade' : 'text-text-muted',
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">Экзамен модуля</h2>
            <p className="text-text-muted">
              {examPassed
                ? `Сдан! Лучший результат — ${formatPct(examProgress?.best ?? 0, 0)}.`
                : examOpen
                  ? '15 вопросов по всему модулю. Для сдачи нужно 80%. Сдача открывает следующий модуль.'
                  : 'Откроется, когда пройдёшь все уроки модуля.'}
            </p>
          </div>
          {examOpen && (
            <Link
              to={paths.exam(module.id)}
              className={buttonClass({ variant: examPassed ? 'secondary' : 'xp', size: 'lg' })}
            >
              {examPassed ? 'Пересдать' : 'Сдать экзамен'}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
