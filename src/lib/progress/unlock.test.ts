import { describe, expect, it } from 'vitest';
import type { CourseModule } from '@/types/course';
import type { ProgressState } from '@/types/progress';
import { createCourseIndex } from '@/lib/content';
import {
  currentLesson,
  isExamAvailable,
  isFinalAvailable,
  isModuleUnlocked,
  lessonStatus,
  moduleCompletion,
  starsForScore,
  type UnlockContext,
} from './unlock';

const lesson = (moduleId: string, i: number) => ({
  id: `${moduleId}-l0${i}` as const,
  moduleId: moduleId as `m${string}`,
  index: i,
  title: `${moduleId} ${i}`,
  summary: '',
  minutes: 5,
  terms: [],
});

const mod = (id: string, index: number, lessons: number, hasExam: boolean): CourseModule => ({
  id: id as `m${string}`,
  index,
  title: id,
  description: '',
  icon: 'x',
  color: 'green',
  hasExam,
  lessons: Array.from({ length: lessons }, (_, i) => lesson(id, i + 1)) as CourseModule['lessons'],
});

// m00 (no exam, 2 lessons) → m01 (exam, 2 lessons) → m02 (exam, 1 lesson)
const course = createCourseIndex([
  mod('m00', 0, 2, false),
  mod('m01', 1, 2, true),
  mod('m02', 2, 1, true),
]);

type Progress = Pick<ProgressState, 'lessons' | 'exams'>;
const done = (at = 1) => ({
  quizBest: 0.9,
  quizAttempts: 1,
  timeSpentSec: 0,
  xpEarned: 0,
  improvements: 0,
  completedAt: at,
});
const ctx = (progress: Partial<Progress> = {}, freeMode = false): UnlockContext => ({
  course,
  progress: { lessons: {}, exams: {}, ...progress },
  freeMode,
});

describe('lessonStatus', () => {
  it('opens only the very first lesson for a new learner', () => {
    const c = ctx();
    expect(lessonStatus(c, 'm00-l01')).toBe('available');
    expect(lessonStatus(c, 'm00-l02')).toBe('locked');
    expect(lessonStatus(c, 'm01-l01')).toBe('locked');
    expect(currentLesson(c)?.id).toBe('m00-l01');
  });

  it('opens the next lesson after completing the previous one', () => {
    const c = ctx({ lessons: { 'm00-l01': done() } });
    expect(lessonStatus(c, 'm00-l01')).toBe('completed');
    expect(lessonStatus(c, 'm00-l02')).toBe('available');
    expect(currentLesson(c)?.id).toBe('m00-l02');
  });

  it('marks read-but-not-passed lessons as "read"', () => {
    const c = ctx({
      lessons: {
        'm00-l01': {
          quizBest: 0.5,
          quizAttempts: 1,
          timeSpentSec: 10,
          xpEarned: 0,
          improvements: 0,
          readAt: 5,
        },
      },
    });
    expect(lessonStatus(c, 'm00-l01')).toBe('read');
    expect(lessonStatus(c, 'm00-l02')).toBe('locked');
  });

  it('opens the next module after a module without exam is fully completed', () => {
    const c = ctx({ lessons: { 'm00-l01': done(), 'm00-l02': done() } });
    expect(isModuleUnlocked(c, 'm01')).toBe(true);
    expect(lessonStatus(c, 'm01-l01')).toBe('available');
    expect(lessonStatus(c, 'm01-l02')).toBe('locked');
  });

  it('requires the exam to open the module after an exam module', () => {
    const lessons = { 'm00-l01': done(), 'm00-l02': done(), 'm01-l01': done(), 'm01-l02': done() };
    const noExam = ctx({ lessons });
    expect(isExamAvailable(noExam, 'm01')).toBe(true);
    expect(lessonStatus(noExam, 'm02-l01')).toBe('locked');
    expect(currentLesson(noExam)).toBeUndefined();

    const failed = ctx({ lessons, exams: { m01: { best: 0.6, attempts: 1 } } });
    expect(lessonStatus(failed, 'm02-l01')).toBe('locked');

    const passed = ctx({ lessons, exams: { m01: { best: 0.9, attempts: 1, passedAt: 2 } } });
    expect(lessonStatus(passed, 'm02-l01')).toBe('available');
  });

  it('keeps completed lessons completed even if an earlier one is not (e.g. imported data)', () => {
    const c = ctx({ lessons: { 'm01-l02': done() } });
    expect(lessonStatus(c, 'm01-l02')).toBe('completed');
    expect(lessonStatus(c, 'm01-l01')).toBe('locked');
  });

  it('treats unknown ids as locked', () => {
    expect(lessonStatus(ctx(), 'm99-l01')).toBe('locked');
    expect(isModuleUnlocked(ctx(), 'm99')).toBe(false);
  });

  it('free mode opens everything', () => {
    const c = ctx({}, true);
    expect(lessonStatus(c, 'm02-l01')).toBe('available');
    expect(isExamAvailable(c, 'm02')).toBe(true);
    expect(isFinalAvailable(c)).toBe(true);
  });
});

describe('exams', () => {
  it('exam needs all lessons of an unlocked module; modules without exam never have one', () => {
    expect(isExamAvailable(ctx(), 'm01')).toBe(false);
    expect(isExamAvailable(ctx({ lessons: { 'm01-l01': done(), 'm01-l02': done() } }), 'm01')).toBe(
      false,
    );
    expect(isExamAvailable(ctx({}, true), 'm00')).toBe(false);
  });

  it('final opens after all module exams', () => {
    expect(isFinalAvailable(ctx({ exams: { m01: { best: 1, attempts: 1, passedAt: 1 } } }))).toBe(
      false,
    );
    expect(
      isFinalAvailable(
        ctx({
          exams: {
            m01: { best: 1, attempts: 1, passedAt: 1 },
            m02: { best: 1, attempts: 1, passedAt: 1 },
          },
        }),
      ),
    ).toBe(true);
  });
});

describe('helpers', () => {
  it.each([
    [0.79, false, 0],
    [0.8, true, 1],
    [0.89, true, 1],
    [0.9, true, 2],
    [0.99, true, 2],
    [1, true, 3],
  ] as const)('stars(%s, %s) = %s', (ratio, passed, stars) => {
    expect(starsForScore(ratio, passed)).toBe(stars);
  });

  it('module completion', () => {
    const m01 = course.getModule('m01');
    if (!m01) throw new Error('fixture');
    expect(moduleCompletion(ctx({ lessons: { 'm01-l01': done() } }), m01)).toEqual({
      done: 1,
      total: 2,
      ratio: 0.5,
    });
  });
});
