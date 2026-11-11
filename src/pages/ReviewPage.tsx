import { Suspense, use, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { skillIndex } from '@/content/skills';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { lessonQuizPromise } from '@/features/quiz/quizContent';
import { QuizRunner, type QuizFinish } from '@/features/quiz/QuizRunner';
import { QuizResultView } from '@/features/quiz/QuizResultView';
import { useDueReviews, type DueReview } from '@/features/learner/useDueReviews';
import { answerEvents } from '@/lib/learner/events';
import { answerHistory, pickReviewQuestions, REVIEW_QUIZ_ID } from '@/lib/learner/review';
import { prepareQuiz, type PreparedQuiz } from '@/lib/quiz/prepare';
import { mulberry32 } from '@/lib/random';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';
import type { Quiz } from '@/types/quiz';
import type { LessonId } from '@/types/course';

const REVIEW_PASS_RATIO = 0.6;

/** Questions of the due skills' lessons, picked once per visit. */
function reviewQuizPromise(
  due: readonly DueReview[],
  attempts: Parameters<typeof answerEvents>[0],
) {
  const skills = due.map((d) => d.skill);
  const lessons = [
    ...new Set(skills.flatMap((s) => skillIndex.getSkill(s)?.lessons ?? [])),
  ] as LessonId[];
  return Promise.all(lessons.map((l) => lessonQuizPromise(l))).then((quizzes): Quiz => {
    const pool = quizzes.flatMap((q) => q.questions);
    const history = answerHistory(answerEvents(attempts, skillIndex.skillsOfTags));
    const seed = Date.now();
    const questions = pickReviewQuestions(
      pool,
      skills,
      (q) => skillIndex.skillsOfTags(q.tags),
      history,
      mulberry32(seed),
    );
    return { id: REVIEW_QUIZ_ID, kind: 'lesson', passRatio: REVIEW_PASS_RATIO, questions };
  });
}

type Phase =
  | { kind: 'running'; prepared: PreparedQuiz }
  | { kind: 'result'; prepared: PreparedQuiz; finish: QuizFinish };

function ReviewSession({ quizPromise, titles }: { quizPromise: Promise<Quiz>; titles: string }) {
  const quiz = use(quizPromise);
  const navigate = useNavigate();
  const recordReview = useProgress((s) => s.recordReview);
  const [phase, setPhase] = useState<Phase>(() => ({
    kind: 'running',
    prepared: prepareQuiz(quiz, Date.now()),
  }));

  if (phase.kind === 'running') {
    return (
      <QuizRunner
        prepared={phase.prepared}
        mode="lesson"
        title={`Повторение · ${titles}`}
        onExit={() => navigate(paths.home())}
        onFinish={(finish) => {
          recordReview(finish.result, finish.durationSec);
          setPhase({ kind: 'result', prepared: phase.prepared, finish });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }
  return (
    <QuizResultView
      result={phase.finish.result}
      questions={phase.prepared.questions}
      passRatio={quiz.passRatio}
      failVerdict="Навыки стоит подтянуть: следующее повторение будет уже завтра. Разбор — ниже."
      actions={
        <Link to={paths.home()} className={buttonClass({ size: 'lg' })}>
          На главную
        </Link>
      }
    />
  );
}

export function ReviewPage() {
  usePageTitle('Повторение');
  const due = useDueReviews();
  const attempts = useProgress((s) => s.quizAttempts);
  // Fixed for the visit: the session must not change while answers are recorded.
  const [session] = useState(() =>
    due.length > 0
      ? { promise: reviewQuizPromise(due, attempts), titles: due.map((d) => d.title).join(', ') }
      : null,
  );

  if (!session) {
    return (
      <EmptyState
        art={<Mascot mood="sleeping" size={130} />}
        title="Повторять пока нечего"
        description="Навыки появятся здесь, когда подойдёт срок повторения: через день после теста, потом через 3, 7, 14 дней."
        action={
          <Link to={paths.home()} className={buttonClass({ variant: 'secondary' })}>
            На главную
          </Link>
        }
      />
    );
  }
  return (
    <ErrorBoundary
      resetKey="review"
      fallback={() => (
        <EmptyState
          art={<Mascot mood="shocked" size={130} />}
          title="Не удалось загрузить вопросы"
          action={<Button onClick={() => window.location.reload()}>Повторить</Button>}
        />
      )}
    >
      <Suspense fallback={<PageSkeleton />}>
        <ReviewSession quizPromise={session.promise} titles={session.titles} />
      </Suspense>
    </ErrorBoundary>
  );
}
