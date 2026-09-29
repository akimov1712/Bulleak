import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronRight, Clock } from 'lucide-react';
import { courseIndex } from '@/content/courseIndex';
import { ContentMissingError } from '@/content/loaders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { buttonClass } from '@/components/ui/styles';
import { moduleColors } from '@/components/ui/moduleColors';
import { forgetLessonContent } from '@/features/lesson/lessonCache';
import { LessonContent } from '@/features/lesson/LessonContent';
import { ReadingProgress } from '@/features/lesson/ReadingProgress';
import { TableOfContents } from '@/features/lesson/TableOfContents';
import { LockedLesson } from '@/features/lesson/LockedLesson';
import { LessonFooter } from '@/features/lesson/LessonFooter';
import { useLessonRead } from '@/features/lesson/useLessonRead';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { useProgress } from '@/store/progressStore';
import {
  currentLesson,
  isExamAvailable,
  isLessonUnlocked,
  lessonStatus,
} from '@/lib/progress/unlock';
import { cn } from '@/lib/cn';
import { paths } from '@/app/paths';
import type { LessonMeta } from '@/types/course';
import type { LessonStatus } from '@/types/progress';

const statusBadge: Record<LessonStatus, { tone: 'bull' | 'info' | 'neutral'; label: string }> = {
  completed: { tone: 'bull', label: 'Пройден' },
  read: { tone: 'info', label: 'Прочитан — остался тест' },
  available: { tone: 'neutral', label: 'Новый урок' },
  locked: { tone: 'neutral', label: 'Закрыт' },
};

/** Renders nothing; tells the page that the lazy MDX finished rendering. */
function OnReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

function LessonLoadError({ error, retry }: { error: Error; retry: () => void }) {
  if (error instanceof ContentMissingError) {
    return (
      <EmptyState
        art={<Mascot mood="sleeping" size={130} />}
        title="Этот урок ещё пишется"
        description="Текст урока появится на одном из следующих этапов разработки курса."
        action={
          <Link to={paths.path()} className={buttonClass({ variant: 'secondary' })}>
            К карте курса
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState
      art={<Mascot mood="shocked" size={130} />}
      title="Не удалось загрузить урок"
      description="Проверь соединение и попробуй ещё раз."
      action={<Button onClick={retry}>Повторить</Button>}
    />
  );
}

function LessonView({ lesson }: { lesson: LessonMeta }) {
  usePageTitle(lesson.title);
  const ctx = useUnlockContext();
  const progress = useProgress((s) => s.lessons[lesson.id]);
  const articleRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  useScrollRestore(`lesson:${lesson.id}`, ready);
  useLessonRead(lesson, articleRef, ready);

  const module = courseIndex.getModule(lesson.moduleId);
  const status = lessonStatus(ctx, lesson.id);
  if (status === 'locked' || !module) {
    return <LockedLesson lesson={lesson} next={currentLesson(ctx)} />;
  }

  const prev = courseIndex.prevLesson(lesson.id);
  const next = courseIndex.nextLesson(lesson.id);
  const badge = statusBadge[status];

  return (
    <>
      <ReadingProgress target={articleRef} />
      <div className="mt-6 grid gap-10 xl:grid-cols-[minmax(0,70ch)_13rem]">
        <article ref={articleRef} className="min-w-0 text-[1.0625rem] md:text-lg">
          <nav
            aria-label="Хлебные крошки"
            className="mb-3 flex flex-wrap items-center gap-1 text-sm font-bold text-text-muted"
          >
            <Link to={paths.path()} className="inline-flex min-h-11 items-center hover:text-text">
              Карта курса
            </Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <Link
              to={paths.module(module.id)}
              className="inline-flex min-h-11 items-center hover:text-text"
            >
              Модуль {module.index}. {module.title}
            </Link>
          </nav>
          <header className="mb-2">
            <p className="mb-1 flex items-center gap-2 text-sm font-extrabold tracking-wide text-text-muted uppercase">
              <span
                className={cn('size-2.5 rounded-full', moduleColors[module.color].bg)}
                aria-hidden="true"
              />
              Урок {module.index}.{lesson.index}
            </p>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
              {lesson.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge size="md">
                <Clock className="size-4" aria-hidden="true" />~{lesson.minutes} мин
              </Badge>
              <Badge size="md" tone={badge.tone}>
                {badge.label}
              </Badge>
            </div>
          </header>

          <ErrorBoundary
            resetKey={lesson.id}
            fallback={(error, reset) => (
              <LessonLoadError
                error={error}
                retry={() => {
                  forgetLessonContent(lesson.id);
                  reset();
                }}
              />
            )}
          >
            <Suspense fallback={<PageSkeleton />}>
              <LessonContent id={lesson.id} />
              <OnReady onReady={markReady} />
            </Suspense>
          </ErrorBoundary>

          <LessonFooter
            lesson={lesson}
            status={status}
            progress={progress}
            prev={prev}
            next={next}
            nextUnlocked={next ? isLessonUnlocked(ctx, next) : false}
            examModuleId={
              next && next.moduleId !== module.id && module.hasExam ? module.id : undefined
            }
            examOpen={isExamAvailable(ctx, module.id)}
          />
        </article>
        <aside className="hidden xl:block">
          <TableOfContents container={articleRef} />
        </aside>
      </div>
    </>
  );
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = courseIndex.getLesson(lessonId);
  if (!lesson) {
    return (
      <EmptyState
        art={<Mascot mood="shocked" size={130} />}
        title="Урок не найден"
        description={`В курсе нет урока «${lessonId}».`}
        action={
          <Link to={paths.path()} className={buttonClass()}>
            К карте курса
          </Link>
        }
      />
    );
  }
  // key: fresh state (ready flag, refs) for every lesson.
  return <LessonView key={lesson.id} lesson={lesson} />;
}
