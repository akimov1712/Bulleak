import type { LessonId } from '@/types/course';
import type { QuizResult } from '@/types/quiz';
import type { DayActivity, ExamKey, ProgressState, QuizAttempt } from '@/types/progress';
import { toDateKey } from '@/lib/date';
import { emptyDay, emptyLessonProgress, MAX_QUIZ_ATTEMPTS } from './initial';
import { REVIEW_QUIZ_ID } from '@/lib/learner/review';
import { HINT_BLOCKS_BONUS } from '@/lib/hints/ladder';

/**
 * Pure state transitions for learning progress (no XP/achievements — those are layered on
 * in stage 03 by lib/progress/applyEvent). Every function returns a new state object.
 */

function updateDay(
  state: ProgressState,
  now: number,
  patch: (day: DayActivity) => DayActivity,
): ProgressState['activity'] {
  const key = toDateKey(now);
  return { ...state.activity, [key]: patch(state.activity[key] ?? emptyDay()) };
}

function tagStats(result: QuizResult): QuizAttempt['tags'] {
  const tags: QuizAttempt['tags'] = {};
  for (const q of result.perQuestion) {
    for (const tag of q.tags) {
      const [ok, total] = tags[tag] ?? [0, 0];
      tags[tag] = [ok + (q.correct ? 1 : 0), total + 1];
    }
  }
  return tags;
}

function attemptAnswers(result: QuizResult): QuizAttempt['answers'] {
  return result.perQuestion.map((p) => ({
    q: p.id,
    ok: p.correct,
    tags: p.tags,
    ...(p.type !== undefined && { type: p.type }),
    ...(p.sec !== undefined && { sec: p.sec }),
    ...(p.conf !== undefined && { conf: p.conf }),
    ...(p.hint !== undefined && { hint: p.hint }),
  }));
}

/** First time the lesson is read to the end. Idempotent. */
export function markLessonRead(state: ProgressState, id: LessonId, now: number): ProgressState {
  const lesson = state.lessons[id] ?? emptyLessonProgress();
  if (lesson.readAt !== undefined) return state;
  return { ...state, lessons: { ...state.lessons, [id]: { ...lesson, readAt: now } } };
}

/** Active reading time; also counted into the day's minutes. */
export function addLessonTime(
  state: ProgressState,
  id: LessonId,
  seconds: number,
  now: number,
): ProgressState {
  if (!(seconds > 0)) return state;
  const lesson = state.lessons[id] ?? emptyLessonProgress();
  return {
    ...state,
    lessons: { ...state.lessons, [id]: { ...lesson, timeSpentSec: lesson.timeSpentSec + seconds } },
    activity: updateDay(state, now, (d) => ({ ...d, minutes: d.minutes + seconds / 60 })),
  };
}

function pushAttempt(state: ProgressState, attempt: QuizAttempt): QuizAttempt[] {
  return [...state.quizAttempts, attempt].slice(-MAX_QUIZ_ATTEMPTS);
}

export function recordLessonQuiz(
  state: ProgressState,
  id: LessonId,
  result: QuizResult,
  now: number,
  durationSec?: number,
): ProgressState {
  const lesson = state.lessons[id] ?? emptyLessonProgress();
  const firstPass = result.passed && lesson.completedAt === undefined;
  // Only retakes of an already completed lesson count (they are what the improvement XP rewards).
  const improved = lesson.completedAt !== undefined && result.ratio > lesson.quizBest;
  // A perfect test is one answered on one's own: the rule or walkthrough hint does not count.
  const perfect =
    result.ratio === 1 && !result.perQuestion.some((p) => (p.hint ?? 0) >= HINT_BLOCKS_BONUS);
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [id]: {
        ...lesson,
        quizBest: Math.max(lesson.quizBest, result.ratio),
        quizAttempts: lesson.quizAttempts + 1,
        completedAt: firstPass ? now : lesson.completedAt,
        improvements: lesson.improvements + (improved ? 1 : 0),
      },
    },
    quizAttempts: pushAttempt(state, {
      quizId: id,
      at: now,
      ratio: result.ratio,
      passed: result.passed,
      tags: tagStats(result),
      durationSec,
      answers: attemptAnswers(result),
    }),
    activity: updateDay(state, now, (d) => ({
      ...d,
      quizzes: d.quizzes + 1,
      lessonsCompleted: d.lessonsCompleted + (firstPass ? 1 : 0),
    })),
    counters: {
      ...state.counters,
      perfectQuizzes: state.counters.perfectQuizzes + (perfect ? 1 : 0),
    },
  };
}

/** A spaced-review session: an attempt with quizId "review", no lesson or exam changes. */
export function recordReview(
  state: ProgressState,
  result: QuizResult,
  now: number,
  durationSec?: number,
): ProgressState {
  return {
    ...state,
    quizAttempts: pushAttempt(state, {
      quizId: REVIEW_QUIZ_ID,
      at: now,
      ratio: result.ratio,
      passed: result.passed,
      tags: tagStats(result),
      durationSec,
      answers: attemptAnswers(result),
    }),
    activity: updateDay(state, now, (d) => ({ ...d, quizzes: d.quizzes + 1 })),
  };
}

export function recordExam(
  state: ProgressState,
  key: ExamKey,
  result: QuizResult,
  now: number,
  durationSec?: number,
): ProgressState {
  const exam = state.exams[key] ?? { best: 0, attempts: 0 };
  return {
    ...state,
    exams: {
      ...state.exams,
      [key]: {
        ...exam,
        best: Math.max(exam.best, result.ratio),
        attempts: exam.attempts + 1,
        passedAt: exam.passedAt ?? (result.passed ? now : undefined),
        lastAttemptAt: now,
      },
    },
    quizAttempts: pushAttempt(state, {
      quizId: key === 'final' ? 'final' : `${key}-exam`,
      at: now,
      ratio: result.ratio,
      passed: result.passed,
      tags: tagStats(result),
      durationSec,
      answers: attemptAnswers(result),
    }),
    activity: updateDay(state, now, (d) => ({ ...d, quizzes: d.quizzes + 1 })),
  };
}
