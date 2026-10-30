import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Award, GraduationCap, Lock } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { courseIndex } from '@/content/courseIndex';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { buttonClass, cardClass } from '@/components/ui/styles';
import { cn } from '@/lib/cn';
import {
  courseCompletion,
  currentLesson,
  isExamPassed,
  isFinalAvailable,
  isModuleFinished,
  lessonStatus,
} from '@/lib/progress/unlock';
import { ModuleSection } from '@/features/path-map/ModuleSection';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';

export function PathPage() {
  usePageTitle('Карта курса');
  const ctx = useUnlockContext();
  const lessons = useProgress((s) => s.lessons);
  const current = currentLesson(ctx);
  const currentModule = current ? courseIndex.getModule(current.moduleId) : undefined;
  const { done: completed, total } = courseCompletion(ctx);
  const modulesDone = courseIndex.modules.filter((m) => isModuleFinished(ctx, m)).length;
  const finalOpen = isFinalAvailable(ctx);
  const finalPassed = isExamPassed(ctx, 'final');

  // Scroll the current lesson into view once on arrival.
  const [currentEl, setCurrentEl] = useState<HTMLLIElement | null>(null);
  const currentRef = useCallback((el: HTMLLIElement | null) => setCurrentEl(el), []);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!currentEl || scrolled) return;
    currentEl.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time flag after a DOM side effect
    setScrolled(true);
  }, [currentEl, scrolled]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Карта курса" subtitle="13 модулей · 62 урока · экзамены и финал" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-3">
          {courseIndex.modules.map((module) => (
            <ModuleSection
              key={module.id}
              module={module}
              ctx={ctx}
              lessons={lessons}
              currentLessonId={current?.id}
              currentRef={currentRef}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:order-last max-lg:order-first">
          <section aria-label="Прогресс курса" className={cn(cardClass(), 'flex flex-col gap-3')}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Прогресс</h2>
              <span className="font-mono text-sm text-text-muted tabular-nums">
                {completed}/{total}
              </span>
            </div>
            <ProgressBar
              label="Пройдено уроков"
              value={completed / total}
              valueText={`${completed} из ${total}`}
              size="sm"
            />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Уроков</dt>
                <dd className="font-mono tabular-nums">{Math.round((completed / total) * 100)}%</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Модулей</dt>
                <dd className="font-mono tabular-nums">{modulesDone} / 13</dd>
              </div>
            </dl>
            {current && currentModule && (
              <Link
                to={
                  lessonStatus(ctx, current.id) === 'read'
                    ? paths.lessonQuiz(current.id)
                    : paths.lesson(current.id)
                }
                className={buttonClass({ fullWidth: true })}
              >
                Продолжить · урок {currentModule.index}.{current.index}
              </Link>
            )}
          </section>

          <section
            aria-label="Финал"
            className={cn(cardClass(), 'flex flex-col gap-3', finalPassed && 'border-xp/60')}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-(--radius-btn)',
                  finalPassed
                    ? 'bg-xp text-on-xp'
                    : finalOpen
                      ? 'bg-epic-soft text-epic'
                      : 'bg-surface-2 text-text-muted',
                )}
              >
                {finalOpen || finalPassed ? (
                  <GraduationCap className="size-5" aria-hidden="true" />
                ) : (
                  <Lock className="size-4" aria-hidden="true" />
                )}
              </span>
              <h2 className="font-semibold">Финальный экзамен</h2>
            </div>
            <p className="text-sm text-text-muted">
              {finalPassed
                ? 'Курс пройден!'
                : finalOpen
                  ? 'Все модули сданы — время финала!'
                  : 'Откроется после экзаменов всех модулей.'}
            </p>
            {(finalOpen || finalPassed) && (
              <Link
                to={paths.finalExam()}
                aria-label={finalPassed ? 'Финальный экзамен: сдан' : 'Финальный экзамен: открыт'}
                className={buttonClass({ variant: 'secondary', fullWidth: true })}
              >
                {finalPassed ? 'Пересдать финал' : 'К финалу'}
              </Link>
            )}
            {finalPassed && (
              <Link
                to={paths.certificate()}
                className="flex min-h-11 items-center gap-2 text-sm font-semibold text-info hover:underline"
              >
                <Award className="size-4" aria-hidden="true" />
                Мой сертификат
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
