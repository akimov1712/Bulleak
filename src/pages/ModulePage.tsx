import { Link, useParams } from 'react-router';
import { ChevronRight, Clock, Lock, Trophy } from 'lucide-react';
import { courseIndex } from '@/content/courseIndex';
import { cn } from '@/lib/cn';
import { formatPct, plural } from '@/lib/format';
import {
  isExamAvailable,
  isExamPassed,
  isModuleUnlocked,
  currentLesson,
  lessonStatus,
  moduleCompletion,
  starsForScore,
} from '@/lib/progress/unlock';
import { moduleColors } from '@/components/ui/moduleColors';
import { ModuleIcon } from '@/components/ui/ModuleIcon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/Skeleton';
import { buttonClass, cardClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { LessonRow } from '@/features/path-map/CourseRows';
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
  const current = currentLesson(ctx);

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Хлебные крошки"
        className="flex items-center gap-1 text-sm font-medium text-text-muted"
      >
        <Link to={paths.path()} className="inline-flex min-h-11 items-center hover:text-text">
          Карта курса
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span>Модуль {module.index}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-(--radius-btn) border border-border bg-surface',
              unlocked ? colors.text : 'text-text-muted',
            )}
          >
            <ModuleIcon name={module.icon} className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-text-muted">
              Модуль {String(module.index).padStart(2, '0')}
            </p>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
              {module.title}
            </h1>
            <p className="mt-1 text-text-muted">{module.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-text-muted">
            <span>
              {completion.done} из {completion.total}{' '}
              {plural(completion.total, ['урока', 'уроков', 'уроков'])} пройдено
            </span>
            <span className="flex items-center gap-1 font-mono text-xs">
              <Clock className="size-3.5" aria-hidden="true" />~{minutes} мин
            </span>
          </div>
          <ProgressBar
            label="Прогресс модуля"
            value={completion.ratio}
            valueText={`${completion.done} из ${completion.total}`}
            size="sm"
          />
        </div>
      </header>

      {!unlocked && previous && (
        <p className="flex items-center gap-3 rounded-(--radius-card) border border-dashed border-border p-4 text-sm text-text-muted">
          <Lock className="size-5 shrink-0" aria-hidden="true" />
          Модуль откроется после {previous.hasExam ? 'экзамена' : 'прохождения'} модуля{' '}
          {previous.index} «{previous.title}».
        </p>
      )}

      <ol
        className={cn(cardClass({ padding: 'none' }), 'overflow-hidden py-1')}
        aria-label="Уроки модуля"
      >
        {module.lessons.map((lesson) => {
          const status = lessonStatus(ctx, lesson.id);
          return (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              moduleIndex={module.index}
              status={status}
              stars={starsForScore(
                lessonsProgress[lesson.id]?.quizBest ?? 0,
                status === 'completed',
              )}
              isCurrent={lesson.id === current?.id}
              withSummary
            />
          );
        })}
      </ol>

      {module.hasExam && (
        <section
          aria-label="Экзамен модуля"
          className={cn(
            cardClass(),
            'flex flex-col gap-4 sm:flex-row sm:items-center',
            examPassed ? 'border-xp/60' : !examOpen && 'border-dashed',
          )}
        >
          <Trophy
            className={cn(
              'size-8 shrink-0',
              examPassed ? 'fill-xp text-xp' : examOpen ? 'text-xp' : 'text-text-muted',
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <h2 className="font-semibold">Экзамен модуля</h2>
            <p className="text-sm text-text-muted">
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
              className={buttonClass({ variant: examPassed ? 'secondary' : 'primary' })}
            >
              {examPassed ? 'Пересдать' : 'Сдать экзамен'}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
