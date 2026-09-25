import { Suspense, use, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ClipboardCheck, Target, Trophy } from 'lucide-react';
import { courseIndex } from '@/content/courseIndex';
import { ContentMissingError } from '@/content/loaders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { MascotSay } from '@/components/mascot/MascotSay';
import { LockedLesson } from '@/features/lesson/LockedLesson';
import { forgetQuiz, lessonQuizPromise } from '@/features/quiz/quizContent';
import { QuizRunner, type QuizFinish } from '@/features/quiz/QuizRunner';
import { QuizResultView } from '@/features/quiz/QuizResultView';
import { prepareQuiz, type PreparedQuiz } from '@/lib/quiz/prepare';
import {
  currentLesson,
  isExamAvailable,
  isExamPassed,
  isLessonUnlocked,
  lessonStatus,
} from '@/lib/progress/unlock';
import { formatPct, plural } from '@/lib/format';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';
import type { LessonMeta } from '@/types/course';

type Phase =
  | { kind: 'intro' }
  | { kind: 'running'; prepared: PreparedQuiz }
  | { kind: 'result'; prepared: PreparedQuiz; finish: QuizFinish };

function LessonQuiz({ lesson }: { lesson: LessonMeta }) {
  const quiz = use(lessonQuizPromise(lesson.id));
  const navigate = useNavigate();
  const ctx = useUnlockContext();
  const progress = useProgress((s) => s.lessons[lesson.id]);
  const recordQuiz = useProgress((s) => s.recordQuiz);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });

  const start = () => setPhase({ kind: 'running', prepared: prepareQuiz(quiz, Date.now()) });

  if (phase.kind === 'running') {
    return (
      <QuizRunner
        prepared={phase.prepared}
        mode="lesson"
        title={`Тест · ${lesson.title}`}
        onExit={() => navigate(paths.lesson(lesson.id))}
        onFinish={(finish) => {
          recordQuiz(lesson.id, finish.result, finish.durationSec);
          setPhase({ kind: 'result', prepared: phase.prepared, finish });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (phase.kind === 'result') {
    const { result } = phase.finish;
    const next = courseIndex.nextLesson(lesson.id);
    const nextOpen = next !== undefined && isLessonUnlocked(ctx, next);
    // Last lesson of a module: the exam (not the next lesson) is the next step.
    const examOpen = isExamAvailable(ctx, lesson.moduleId) && !isExamPassed(ctx, lesson.moduleId);
    return (
      <QuizResultView
        result={result}
        questions={phase.prepared.questions}
        passRatio={quiz.passRatio}
        note={
          progress && progress.quizAttempts > 1 ? (
            <p className="text-sm text-text-muted">
              Лучший результат: {formatPct(progress.quizBest, 0)}
            </p>
          ) : undefined
        }
        actions={
          result.passed ? (
            <>
              {nextOpen && next ? (
                <Link to={paths.lesson(next.id)} className={buttonClass({ size: 'lg' })}>
                  Следующий урок
                </Link>
              ) : examOpen ? (
                <Link
                  to={paths.exam(lesson.moduleId)}
                  className={buttonClass({ variant: 'xp', size: 'lg' })}
                >
                  К экзамену модуля
                </Link>
              ) : (
                <Link to={paths.path()} className={buttonClass({ size: 'lg' })}>
                  К карте курса
                </Link>
              )}
              <Button variant="secondary" size="lg" onClick={start}>
                Пересдать
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={start}>
                Пересдать
              </Button>
              <Link
                to={paths.lesson(lesson.id)}
                className={buttonClass({ variant: 'secondary', size: 'lg' })}
              >
                Повторить урок
              </Link>
            </>
          )
        }
      />
    );
  }

  const best = progress?.quizBest ?? 0;
  const count = quiz.questions.length;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <MascotSay mood="pointing" layout="stack">
        Проверим, что запомнилось из урока «{lesson.title}»?
      </MascotSay>
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Тест по уроку</h1>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3">
            <ClipboardCheck className="size-6 text-info" aria-hidden="true" />
            {count} {plural(count, ['вопрос', 'вопроса', 'вопросов'])}, ответ проверяется сразу
          </li>
          <li className="flex items-center gap-3">
            <Target className="size-6 text-primary-shade" aria-hidden="true" />
            Для сдачи нужно {formatPct(quiz.passRatio, 0)} правильных ответов
          </li>
          {progress && progress.quizAttempts > 0 && (
            <li className="flex items-center gap-3">
              <Trophy className="size-6 text-xp-shade" aria-hidden="true" />
              Лучший результат: {formatPct(best, 0)} ({progress.quizAttempts}{' '}
              {plural(progress.quizAttempts, ['попытка', 'попытки', 'попыток'])})
            </li>
          )}
        </ul>
        <Button size="lg" fullWidth onClick={start}>
          Начать
        </Button>
      </Card>
      <Link
        to={paths.lesson(lesson.id)}
        className="text-center font-bold text-info hover:underline"
      >
        Вернуться к уроку
      </Link>
    </div>
  );
}

function QuizLoadError({
  error,
  retry,
  lessonId,
}: {
  error: Error;
  retry: () => void;
  lessonId: string;
}) {
  if (error instanceof ContentMissingError) {
    return (
      <EmptyState
        art={<Mascot mood="sleeping" size={130} />}
        title="Тест к этому уроку ещё пишется"
        action={
          <Link to={paths.lesson(lessonId)} className={buttonClass({ variant: 'secondary' })}>
            К уроку
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState
      art={<Mascot mood="shocked" size={130} />}
      title="Не удалось загрузить тест"
      action={<Button onClick={retry}>Повторить</Button>}
    />
  );
}

export function QuizPage() {
  const { lessonId = '' } = useParams();
  const lesson = courseIndex.getLesson(lessonId);
  usePageTitle(lesson ? `Тест: ${lesson.title}` : 'Тест');
  const ctx = useUnlockContext();

  if (!lesson) {
    return <EmptyState art={<Mascot mood="shocked" size={130} />} title="Урок не найден" />;
  }
  if (lessonStatus(ctx, lesson.id) === 'locked') {
    return <LockedLesson lesson={lesson} next={currentLesson(ctx)} />;
  }
  return (
    <ErrorBoundary
      resetKey={lesson.id}
      fallback={(error, reset) => (
        <QuizLoadError
          error={error}
          lessonId={lesson.id}
          retry={() => {
            forgetQuiz(`lesson:${lesson.id}`);
            reset();
          }}
        />
      )}
    >
      <Suspense fallback={<PageSkeleton />}>
        <LessonQuiz key={lesson.id} lesson={lesson} />
      </Suspense>
    </ErrorBoundary>
  );
}
