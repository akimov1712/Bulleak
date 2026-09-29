import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Award, GraduationCap, Lock } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { courseIndex } from '@/content/courseIndex';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { currentLesson, isExamPassed, isFinalAvailable } from '@/lib/progress/unlock';
import { ModuleSection } from '@/features/path-map/ModuleSection';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';

export function PathPage() {
  usePageTitle('Карта курса');
  const ctx = useUnlockContext();
  const lessons = useProgress((s) => s.lessons);
  const current = currentLesson(ctx);
  const completed = courseIndex.lessons.filter(
    (l) => lessons[l.id]?.completedAt !== undefined,
  ).length;
  const finalOpen = isFinalAvailable(ctx);
  const finalPassed = isExamPassed(ctx, 'final');

  // Scroll the current lesson into view once on arrival.
  const [currentEl, setCurrentEl] = useState<HTMLDivElement | null>(null);
  const currentRef = useCallback((el: HTMLDivElement | null) => setCurrentEl(el), []);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!currentEl || scrolled) return;
    currentEl.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time flag after a DOM side effect
    setScrolled(true);
  }, [currentEl, scrolled]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <PageHeader title="Карта курса" subtitle="13 модулей · 62 урока" />
        <div className="flex items-center gap-3">
          <ProgressBar
            label="Пройдено уроков"
            value={completed / courseIndex.lessons.length}
            valueText={`${completed} из ${courseIndex.lessons.length}`}
            size="lg"
          />
          <span className="shrink-0 font-mono text-sm font-extrabold text-text-muted">
            {completed}/{courseIndex.lessons.length}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-14">
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

        <section aria-label="Финал" className="flex flex-col items-center gap-4 pb-6 text-center">
          <Link
            to={paths.finalExam()}
            aria-disabled={!finalOpen}
            onClick={(e) => {
              if (!finalOpen) e.preventDefault();
            }}
            className={cn(
              'grid size-28 place-items-center rounded-full border-4',
              finalPassed
                ? 'border-xp-shade bg-xp text-on-xp shadow-[0_8px_0_0_var(--xp-shade)]'
                : finalOpen
                  ? 'border-epic bg-epic-soft text-epic shadow-[0_8px_0_0_var(--epic)]'
                  : 'cursor-not-allowed border-border bg-surface-2 text-text-muted',
            )}
          >
            {finalOpen || finalPassed ? (
              <GraduationCap className="size-14" aria-hidden="true" />
            ) : (
              <Lock className="size-10" aria-hidden="true" />
            )}
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold">Финальный экзамен</h2>
            <p className="text-text-muted">
              {finalPassed
                ? 'Курс пройден!'
                : finalOpen
                  ? 'Все модули сданы — время финала!'
                  : 'Откроется после экзаменов всех модулей.'}
            </p>
          </div>
          {finalPassed && (
            <Link
              to={paths.certificate()}
              className="flex min-h-11 items-center gap-2 font-extrabold text-info hover:underline"
            >
              <Award className="size-5" aria-hidden="true" />
              Мой сертификат
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
