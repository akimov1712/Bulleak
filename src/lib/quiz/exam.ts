/** Module exam rules: retake cooldown and "weak lessons" after a failed attempt. */
import type { LessonId } from '@/types/course';
import type { ExamProgress } from '@/types/progress';
import type { Question, QuizResult } from '@/types/quiz';

/** A failed exam can be retaken after 10 minutes (exams-certificate.md). */
export const EXAM_RETAKE_COOLDOWN_MS = 10 * 60_000;

/** Milliseconds until the exam may be retaken (0 = now). Passed exams have no cooldown. */
export function examRetakeWaitMs(progress: ExamProgress | undefined, now: number): number {
  if (!progress?.lastAttemptAt || progress.passedAt !== undefined) return 0;
  return Math.max(0, progress.lastAttemptAt + EXAM_RETAKE_COOLDOWN_MS - now);
}

/** Lesson a question belongs to: the lesson of its first tag that maps to one. */
export function questionLesson(
  question: Pick<Question, 'tags'>,
  lessonOfTag: (tag: string) => LessonId | undefined,
): LessonId | undefined {
  for (const tag of question.tags) {
    const lesson = lessonOfTag(tag);
    if (lesson) return lesson;
  }
  return undefined;
}

export interface WeakLesson {
  lessonId: LessonId;
  mistakes: number;
}

/** Lessons with mistakes, most mistakes first (ties keep course order via `order`). */
export function weakLessons(
  result: QuizResult,
  questions: readonly Question[],
  lessonOfTag: (tag: string) => LessonId | undefined,
  order: readonly LessonId[],
): WeakLesson[] {
  const counts = new Map<LessonId, number>();
  for (const q of questions) {
    if (result.perQuestion.find((p) => p.id === q.id)?.correct !== false) continue;
    const lesson = questionLesson(q, lessonOfTag);
    if (lesson) counts.set(lesson, (counts.get(lesson) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([lessonId, mistakes]) => ({ lessonId, mistakes }))
    .sort(
      (a, b) => b.mistakes - a.mistakes || order.indexOf(a.lessonId) - order.indexOf(b.lessonId),
    );
}
