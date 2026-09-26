import { describe, expect, it } from 'vitest';
import type { LessonId } from '@/types/course';
import type { Question, QuizResult } from '@/types/quiz';
import {
  EXAM_RETAKE_COOLDOWN_MS,
  examRetakeWaitMs,
  moduleLessonOfTag,
  questionLesson,
  weakLessons,
} from './exam';

const L1 = 'm01-l01' as LessonId;
const L2 = 'm01-l02' as LessonId;
const L3 = 'm01-l03' as LessonId;
const lessonOfTag = (tag: string) =>
  ({ bitcoin: L1, token: L2, spread: L3 })[tag] as LessonId | undefined;

const q = (id: string, tags: string[]): Question => ({
  id,
  type: 'truefalse',
  prompt: '?',
  explanation: '',
  correct: true,
  tags,
});

describe('examRetakeWaitMs', () => {
  it('waits 10 minutes after a failed attempt', () => {
    expect(examRetakeWaitMs({ best: 0.5, attempts: 1, lastAttemptAt: 1000 }, 1000)).toBe(
      EXAM_RETAKE_COOLDOWN_MS,
    );
    expect(
      examRetakeWaitMs({ best: 0.5, attempts: 1, lastAttemptAt: 0 }, EXAM_RETAKE_COOLDOWN_MS + 5),
    ).toBe(0);
  });

  it('has no cooldown before the first attempt or after passing', () => {
    expect(examRetakeWaitMs(undefined, 0)).toBe(0);
    expect(examRetakeWaitMs({ best: 0.9, attempts: 1, lastAttemptAt: 10, passedAt: 10 }, 11)).toBe(
      0,
    );
  });
});

describe('weak lessons', () => {
  it('maps a question to the lesson of its first known tag', () => {
    expect(questionLesson(q('a', ['unknown', 'token']), lessonOfTag)).toBe(L2);
    expect(questionLesson(q('b', ['unknown']), lessonOfTag)).toBeUndefined();
  });

  it('counts mistakes per lesson, most first, ties in course order', () => {
    const questions = [
      q('1', ['spread']),
      q('2', ['spread']),
      q('3', ['bitcoin']),
      q('4', ['token']),
      q('5', ['bitcoin']),
      q('6', ['unknown']),
    ];
    const result: QuizResult = {
      quizId: 'm01',
      correct: 1,
      total: 6,
      ratio: 1 / 6,
      passed: false,
      perQuestion: [
        { id: '1', correct: false, tags: [] },
        { id: '2', correct: false, tags: [] },
        { id: '3', correct: false, tags: [] },
        { id: '4', correct: false, tags: [] },
        { id: '5', correct: true, tags: [] },
        { id: '6', correct: false, tags: [] },
      ],
    };
    expect(weakLessons(result, questions, lessonOfTag, [L1, L2, L3])).toEqual([
      { lessonId: L3, mistakes: 2 },
      { lessonId: L1, mistakes: 1 },
      { lessonId: L2, mistakes: 1 },
    ]);
  });
});

describe('moduleLessonOfTag', () => {
  it('prefers a lesson of the module that lists the term, then falls back', () => {
    const M2L1 = 'm02-l01' as LessonId;
    const map = moduleLessonOfTag([{ id: M2L1, terms: ['2fa', 'subaccount'] }], () => L1);
    expect(map('2fa')).toBe(M2L1);
    expect(map('bitcoin')).toBe(L1);
  });
});
