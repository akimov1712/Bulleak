import { describe, expect, it } from 'vitest';
import { courseIndex } from '@/content/courseIndex';
import { emptyLessonProgress } from './initial';
import { nextStep, shouldRemindBackup } from './nextStep';
import { courseCompletion, type UnlockContext } from './unlock';

const done = { ...emptyLessonProgress(), completedAt: 1, quizBest: 1 };
const ctx = (patch: Partial<UnlockContext['progress']> = {}): UnlockContext => ({
  course: courseIndex,
  progress: { lessons: {}, exams: {}, ...patch },
  freeMode: false,
});
const allLessons = (moduleIds: string[]) =>
  Object.fromEntries(
    courseIndex.lessons.filter((l) => moduleIds.includes(l.moduleId)).map((l) => [l.id, done]),
  );

describe('nextStep', () => {
  it('starts with the first lesson', () => {
    expect(nextStep(ctx())).toMatchObject({
      kind: 'lesson',
      lesson: { id: 'm00-l01' },
      status: 'available',
    });
  });

  it('points to the exam when all lessons of the open module are done', () => {
    const step = nextStep(ctx({ lessons: allLessons(['m00', 'm01']) }));
    expect(step).toMatchObject({ kind: 'exam', module: { id: 'm01' } });
  });

  it('continues with the next module after its exam', () => {
    const step = nextStep(
      ctx({
        lessons: allLessons(['m00', 'm01']),
        exams: { m01: { best: 1, attempts: 1, passedAt: 1 } },
      }),
    );
    expect(step).toMatchObject({ kind: 'lesson', lesson: { id: 'm02-l01' } });
  });

  it('offers the final exam and then reports the course as done', () => {
    const allModules = courseIndex.modules.map((m) => m.id);
    const exams = Object.fromEntries(
      courseIndex.modules
        .filter((m) => m.hasExam)
        .map((m) => [m.id, { best: 1, attempts: 1, passedAt: 1 }]),
    );
    expect(nextStep(ctx({ lessons: allLessons(allModules), exams }))).toEqual({ kind: 'final' });
    expect(
      nextStep(
        ctx({
          lessons: allLessons(allModules),
          exams: { ...exams, final: { best: 1, attempts: 1, passedAt: 1 } },
        }),
      ),
    ).toEqual({ kind: 'done' });
  });
});

describe('shouldRemindBackup', () => {
  const DAY = 86_400_000;
  it('reminds after a week without backup, only with progress', () => {
    expect(shouldRemindBackup({ startedAt: 0 }, 0, 30 * DAY)).toBe(false);
    expect(shouldRemindBackup({ startedAt: 0 }, 10, 6 * DAY)).toBe(false);
    expect(shouldRemindBackup({ startedAt: 0 }, 10, 7 * DAY)).toBe(true);
    expect(shouldRemindBackup({ startedAt: 0, lastBackupAt: 5 * DAY }, 10, 8 * DAY)).toBe(false);
    expect(shouldRemindBackup({ startedAt: 0 }, 10, 8 * DAY, 9 * DAY)).toBe(false);
    expect(shouldRemindBackup({ startedAt: 0 }, 10, 10 * DAY, 9 * DAY)).toBe(true);
  });
});

describe('courseCompletion', () => {
  it('counts completed lessons out of the whole course', () => {
    const total = courseIndex.lessons.length;
    expect(courseCompletion(ctx())).toEqual({ done: 0, total });
    expect(courseCompletion(ctx({ lessons: allLessons(['m00']) }))).toEqual({
      done: courseIndex.lessons.filter((l) => l.moduleId === 'm00').length,
      total,
    });
  });

  it('ignores lessons that were only read', () => {
    const read = { ...emptyLessonProgress(), readAt: 1 };
    expect(courseCompletion(ctx({ lessons: { 'm00-l01': read } })).done).toBe(0);
  });
});
