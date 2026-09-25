import type { CourseModule, LessonId, LessonMeta, ModuleId } from '@/types/course';
import type { LessonStatus, ProgressState } from '@/types/progress';
import type { CourseIndex } from '@/lib/content';

/** Everything the unlock rules need. See docs/04-features/path-map.md. */
export interface UnlockContext {
  course: CourseIndex;
  progress: Pick<ProgressState, 'lessons' | 'exams'>;
  freeMode: boolean;
}

export function isLessonCompleted(ctx: UnlockContext, id: LessonId): boolean {
  return ctx.progress.lessons[id]?.completedAt !== undefined;
}

export function isExamPassed(ctx: UnlockContext, id: ModuleId | 'final'): boolean {
  return ctx.progress.exams[id]?.passedAt !== undefined;
}

function allLessonsCompleted(ctx: UnlockContext, module: CourseModule): boolean {
  return module.lessons.every((l) => isLessonCompleted(ctx, l.id));
}

/** A module is finished when its exam is passed (or, without an exam, all lessons are done). */
export function isModuleFinished(ctx: UnlockContext, module: CourseModule): boolean {
  return module.hasExam ? isExamPassed(ctx, module.id) : allLessonsCompleted(ctx, module);
}

/** Module 0 is always open; module N opens when module N−1 is finished. */
export function isModuleUnlocked(ctx: UnlockContext, moduleId: ModuleId): boolean {
  if (ctx.freeMode) return true;
  const modules = ctx.course.modules;
  const position = modules.findIndex((m) => m.id === moduleId);
  if (position <= 0) return position === 0;
  const previous = modules[position - 1];
  return previous !== undefined && isModuleFinished(ctx, previous);
}

export function isLessonUnlocked(ctx: UnlockContext, lesson: LessonMeta): boolean {
  if (ctx.freeMode) return true;
  if (!isModuleUnlocked(ctx, lesson.moduleId)) return false;
  const module = ctx.course.getModule(lesson.moduleId);
  const position = module?.lessons.findIndex((l) => l.id === lesson.id) ?? -1;
  if (position <= 0) return position === 0;
  const previous = module?.lessons[position - 1];
  return previous !== undefined && isLessonCompleted(ctx, previous.id);
}

export function lessonStatus(ctx: UnlockContext, id: LessonId): LessonStatus {
  const lesson = ctx.course.getLesson(id);
  if (!lesson) return 'locked';
  const progress = ctx.progress.lessons[id];
  if (progress?.completedAt !== undefined) return 'completed';
  if (!isLessonUnlocked(ctx, lesson)) return 'locked';
  return progress?.readAt !== undefined ? 'read' : 'available';
}

/** Exam opens when every lesson of the module is completed (and the module itself is open). */
export function isExamAvailable(ctx: UnlockContext, moduleId: ModuleId): boolean {
  const module = ctx.course.getModule(moduleId);
  if (!module?.hasExam) return false;
  if (ctx.freeMode) return true;
  return isModuleUnlocked(ctx, moduleId) && allLessonsCompleted(ctx, module);
}

export function isFinalAvailable(ctx: UnlockContext): boolean {
  if (ctx.freeMode) return true;
  return ctx.course.modules.filter((m) => m.hasExam).every((m) => isExamPassed(ctx, m.id));
}

/** The lesson the learner should do next: first unlocked lesson that is not completed. */
export function currentLesson(ctx: UnlockContext): LessonMeta | undefined {
  return ctx.course.lessons.find((l) => !isLessonCompleted(ctx, l.id) && isLessonUnlocked(ctx, l));
}

/** Stars for the path map: 80–89% ★, 90–99% ★★, 100% ★★★ (0 when not passed). */
export function starsForScore(ratio: number, passed: boolean): 0 | 1 | 2 | 3 {
  if (!passed) return 0;
  if (ratio >= 1) return 3;
  if (ratio >= 0.9) return 2;
  return 1;
}

export function moduleCompletion(ctx: UnlockContext, module: CourseModule) {
  const done = module.lessons.filter((l) => isLessonCompleted(ctx, l.id)).length;
  return {
    done,
    total: module.lessons.length,
    ratio: module.lessons.length ? done / module.lessons.length : 0,
  };
}
