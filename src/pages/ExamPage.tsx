import { Suspense, use, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Clock, ClipboardCheck, Target, Trophy } from 'lucide-react';
import { courseIndex } from '@/content/courseIndex';
import { ContentMissingError } from '@/content/loaders';
import { getTerm } from '@/content/glossary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { MascotSay } from '@/components/mascot/MascotSay';
import { PagePlaceholder } from '@/app/layout/PagePlaceholder';
import { examPromise, forgetQuiz } from '@/features/quiz/quizContent';
import { QuizRunner, type QuizFinish } from '@/features/quiz/QuizRunner';
import { QuizResultView } from '@/features/quiz/QuizResultView';
import { prepareQuiz, type PreparedQuiz } from '@/lib/quiz/prepare';
import { examRetakeWaitMs, weakLessons } from '@/lib/quiz/exam';
import { isExamAvailable, isExamPassed } from '@/lib/progress/unlock';
import { formatPct, plural } from '@/lib/format';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNow } from '@/hooks/useNow';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';
import type { CourseModule, LessonId } from '@/types/course';

type Phase =
  | { kind: 'intro' }
  | { kind: 'running'; prepared: PreparedQuiz }
  | { kind: 'result'; prepared: PreparedQuiz; finish: QuizFinish };

const lessonOfTag = (tag: string) => getTerm(tag)?.lessonId as LessonId | undefined;

function ModuleExam({ module }: { module: CourseModule }) {
  const quiz = use(examPromise(module.id));
  const navigate = useNavigate();
  const ctx = useUnlockContext();
  const progress = useProgress((s) => s.exams[module.id]);
  const recordExam = useProgress((s) => s.recordExam);
  const now = useNow();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });

  const waitMs = examRetakeWaitMs(progress, now);
  const start = () => setPhase({ kind: 'running', prepared: prepareQuiz(quiz, Date.now()) });

  if (phase.kind === 'running') {
    return (
      <QuizRunner
        prepared={phase.prepared}
        mode="exam"
        title={`Экзамен · ${module.title}`}
        onExit={() => navigate(paths.module(module.id))}
        onFinish={(finish) => {
          recordExam(module.id, finish.result, finish.durationSec);
          setPhase({ kind: 'result', prepared: phase.prepared, finish });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (phase.kind === 'result') {
    const { result } = phase.finish;
    const next = courseIndex.nextModule(module.id);
    const weak = result.passed
      ? []
      : weakLessons(
          result,
          phase.prepared.questions,
          lessonOfTag,
          module.lessons.map((l) => l.id),
        );
    return (
      <QuizResultView
        kind="exam"
        result={result}
        questions={phase.prepared.questions}
        passRatio={quiz.passRatio}
        note={
          weak.length > 0 ? (
            <section className="w-full text-left" aria-label="Что повторить">
              <h2 className="mb-2 text-lg font-extrabold">Что повторить</h2>
              <ul className="flex flex-col gap-2">
                {weak.map(({ lessonId, mistakes }) => {
                  const lesson = courseIndex.getLesson(lessonId);
                  return (
                    <li key={lessonId}>
                      <Link
                        to={paths.lesson(lessonId)}
                        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-surface px-4 py-3 font-bold hover:border-info"
                      >
                        <span>{lesson?.title ?? lessonId}</span>
                        <span className="shrink-0 text-sm text-bear">
                          {mistakes} {plural(mistakes, ['ошибка', 'ошибки', 'ошибок'])}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : undefined
        }
        actions={
          result.passed ? (
            next ? (
              <Link to={paths.module(next.id)} className={buttonClass({ size: 'lg' })}>
                К модулю «{next.title}»
              </Link>
            ) : (
              <Link to={paths.path()} className={buttonClass({ size: 'lg' })}>
                К карте курса
              </Link>
            )
          ) : (
            <>
              <p className="text-sm text-text-muted">
                Пересдать можно через 10 минут — используй их, чтобы повторить уроки.
              </p>
              <Link
                to={paths.module(module.id)}
                className={buttonClass({ variant: 'secondary', size: 'lg' })}
              >
                К урокам модуля
              </Link>
            </>
          )
        }
      />
    );
  }

  const sample = quiz.sample ?? quiz.questions.length;
  const passed = isExamPassed(ctx, module.id);
  // `now` ticks in 10 s steps, so round rather than ceil to avoid showing 11 minutes.
  const waitMin = Math.max(1, Math.round(waitMs / 60_000));
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <MascotSay mood="thinking" layout="stack">
        Экзамен модуля «{module.title}». Объяснения покажу в конце — отвечай уверенно!
      </MascotSay>
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Экзамен модуля</h1>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3">
            <ClipboardCheck className="size-6 text-info" aria-hidden="true" />
            {sample} {plural(sample, ['вопрос', 'вопроса', 'вопросов'])} по всем урокам модуля
          </li>
          <li className="flex items-center gap-3">
            <Target className="size-6 text-primary-shade" aria-hidden="true" />
            Для сдачи нужно {formatPct(quiz.passRatio, 0)}; разбор ответов — в конце
          </li>
          {progress && progress.attempts > 0 && (
            <li className="flex items-center gap-3">
              <Trophy className="size-6 text-xp-shade" aria-hidden="true" />
              {passed ? 'Экзамен сдан. ' : ''}Лучший результат: {formatPct(progress.best, 0)}
            </li>
          )}
        </ul>
        {waitMs > 0 ? (
          <p
            className="flex items-center gap-3 rounded-2xl bg-warn-soft p-3 font-bold"
            role="status"
          >
            <Clock className="size-6 shrink-0 text-warn" aria-hidden="true" />
            Пересдача откроется через {waitMin} {plural(waitMin, ['минуту', 'минуты', 'минут'])}.
            Самое время повторить слабые уроки.
          </p>
        ) : (
          <Button size="lg" fullWidth onClick={start}>
            {passed ? 'Пройти ещё раз' : 'Начать экзамен'}
          </Button>
        )}
      </Card>
      <Link
        to={paths.module(module.id)}
        className="text-center font-bold text-info hover:underline"
      >
        К урокам модуля
      </Link>
    </div>
  );
}

function ExamLoadError({
  error,
  retry,
  module,
}: {
  error: Error;
  retry: () => void;
  module: CourseModule;
}) {
  if (error instanceof ContentMissingError) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="sleeping" size={130} />}
        title="Экзамен этого модуля ещё пишется"
        action={
          <Link to={paths.module(module.id)} className={buttonClass({ variant: 'secondary' })}>
            К модулю
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState
      headingLevel={1}
      art={<Mascot mood="shocked" size={130} />}
      title="Не удалось загрузить экзамен"
      action={<Button onClick={retry}>Повторить</Button>}
    />
  );
}

export function ExamPage() {
  const { moduleId = '' } = useParams();
  const module = courseIndex.getModule(moduleId);
  usePageTitle(module ? `Экзамен: ${module.title}` : 'Экзамен');
  const ctx = useUnlockContext();

  if (moduleId === 'final') {
    return (
      <PagePlaceholder
        title="Финальный экзамен"
        description="Появится на этапе 08, когда будут готовы все модули."
        mood="thinking"
      />
    );
  }
  if (!module?.hasExam) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="shocked" size={130} />}
        title="Экзамен не найден"
      />
    );
  }
  if (!isExamAvailable(ctx, module.id)) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="thinking" size={130} />}
        title="Экзамен пока закрыт"
        description="Экзамен открывается, когда пройдены тесты всех уроков модуля."
        action={
          <Link to={paths.module(module.id)} className={buttonClass()}>
            К урокам модуля
          </Link>
        }
      />
    );
  }
  return (
    <ErrorBoundary
      resetKey={module.id}
      fallback={(error, reset) => (
        <ExamLoadError
          error={error}
          module={module}
          retry={() => {
            forgetQuiz(`exam:${module.id}`);
            reset();
          }}
        />
      )}
    >
      <Suspense fallback={<PageSkeleton />}>
        <ModuleExam key={module.id} module={module} />
      </Suspense>
    </ErrorBoundary>
  );
}
