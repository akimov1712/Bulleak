import type { CourseModule, LessonMeta } from '@/types/course';
import type { LessonStatus } from '@/types/progress';
import {
  currentLesson,
  isExamAvailable,
  isExamPassed,
  isFinalAvailable,
  lessonStatus,
  type UnlockContext,
} from './unlock';

export type NextStep =
  | { kind: 'lesson'; lesson: LessonMeta; status: LessonStatus }
  | { kind: 'exam'; module: CourseModule }
  | { kind: 'final' }
  | { kind: 'done' };

/** What "Продолжить обучение" should lead to. */
export function nextStep(ctx: UnlockContext): NextStep {
  const lesson = currentLesson(ctx);
  if (lesson) return { kind: 'lesson', lesson, status: lessonStatus(ctx, lesson.id) };
  const exam = ctx.course.modules.find(
    (m) => isExamAvailable(ctx, m.id) && !isExamPassed(ctx, m.id),
  );
  if (exam) return { kind: 'exam', module: exam };
  if (isFinalAvailable(ctx) && !isExamPassed(ctx, 'final')) return { kind: 'final' };
  return { kind: 'done' };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Remind about a backup when there is progress and no backup in the last 7 days. */
export function shouldRemindBackup(
  profile: { startedAt: number; lastBackupAt?: number },
  xp: number,
  now: number,
): boolean {
  if (xp <= 0) return false;
  const since = profile.lastBackupAt ?? profile.startedAt;
  return now - since >= WEEK_MS;
}
