import { describe, expect, it } from 'vitest';
import type { QuizResult } from '@/types/quiz';
import { createInitialProgress, MAX_QUIZ_ATTEMPTS, PROGRESS_VERSION } from './initial';
import { migrateProgress } from './migrate';
import { addLessonTime, markLessonRead, recordExam, recordLessonQuiz } from './actions';

const T0 = new Date(2026, 8, 25, 10, 0).getTime();
const DAY = '2026-09-25';

function result(correct: number, total: number, pass = 0.8): QuizResult {
  return {
    quizId: 'm00-l01',
    correct,
    total,
    ratio: correct / total,
    passed: correct / total >= pass,
    perQuestion: Array.from({ length: total }, (_, i) => ({
      id: `q${i}`,
      correct: i < correct,
      tags: i % 2 === 0 ? ['risk'] : ['risk', 'chart'],
    })),
  };
}

describe('createInitialProgress', () => {
  it('starts empty at the current version', () => {
    const s = createInitialProgress(T0);
    expect(s.version).toBe(PROGRESS_VERSION);
    expect(s.xp).toBe(0);
    expect(s.profile.startedAt).toBe(T0);
    expect(s.streak).toEqual({ current: 0, longest: 0, lastActiveDay: null, freezes: 0 });
  });
});

describe('markLessonRead', () => {
  it('sets readAt once', () => {
    const s1 = markLessonRead(createInitialProgress(T0), 'm00-l01', T0);
    expect(s1.lessons['m00-l01']?.readAt).toBe(T0);
    const s2 = markLessonRead(s1, 'm00-l01', T0 + 1000);
    expect(s2).toBe(s1);
  });
});

describe('addLessonTime', () => {
  it('adds seconds to the lesson and minutes to the day', () => {
    let s = addLessonTime(createInitialProgress(T0), 'm00-l01', 90, T0);
    s = addLessonTime(s, 'm00-l01', 30, T0);
    expect(s.lessons['m00-l01']?.timeSpentSec).toBe(120);
    expect(s.activity[DAY]?.minutes).toBe(2);
  });
  it('ignores zero, negative and NaN', () => {
    const s = createInitialProgress(T0);
    expect(addLessonTime(s, 'm00-l01', 0, T0)).toBe(s);
    expect(addLessonTime(s, 'm00-l01', -5, T0)).toBe(s);
    expect(addLessonTime(s, 'm00-l01', Number.NaN, T0)).toBe(s);
  });
});

describe('recordLessonQuiz', () => {
  it('completes the lesson on the first pass and records tag stats', () => {
    const s = recordLessonQuiz(createInitialProgress(T0), 'm00-l01', result(8, 10), T0, 120);
    const lesson = s.lessons['m00-l01'];
    expect(lesson?.completedAt).toBe(T0);
    expect(lesson?.quizBest).toBe(0.8);
    expect(lesson?.quizAttempts).toBe(1);
    expect(s.activity[DAY]).toMatchObject({ quizzes: 1, lessonsCompleted: 1 });
    expect(s.quizAttempts[0]?.tags).toEqual({ risk: [8, 10], chart: [4, 5] });
    expect(s.quizAttempts[0]?.durationSec).toBe(120);
  });

  it('does not complete on a failed attempt', () => {
    const s = recordLessonQuiz(createInitialProgress(T0), 'm00-l01', result(7, 10), T0);
    expect(s.lessons['m00-l01']?.completedAt).toBeUndefined();
    expect(s.activity[DAY]?.lessonsCompleted).toBe(0);
  });

  it('keeps the first completion time, best score and counts improvements', () => {
    let s = recordLessonQuiz(createInitialProgress(T0), 'm00-l01', result(8, 10), T0);
    s = recordLessonQuiz(s, 'm00-l01', result(9, 10), T0 + 1);
    s = recordLessonQuiz(s, 'm00-l01', result(7, 10), T0 + 2);
    s = recordLessonQuiz(s, 'm00-l01', result(10, 10), T0 + 3);
    const lesson = s.lessons['m00-l01'];
    expect(lesson?.completedAt).toBe(T0);
    expect(lesson?.quizBest).toBe(1);
    expect(lesson?.quizAttempts).toBe(4);
    expect(lesson?.improvements).toBe(2);
    expect(s.counters.perfectQuizzes).toBe(1);
    expect(s.activity[DAY]?.lessonsCompleted).toBe(1);
  });

  it('first pass after failures is not an "improvement"', () => {
    let s = recordLessonQuiz(createInitialProgress(T0), 'm00-l01', result(5, 10), T0);
    s = recordLessonQuiz(s, 'm00-l01', result(9, 10), T0 + 1);
    expect(s.lessons['m00-l01']?.improvements).toBe(0);
    expect(s.lessons['m00-l01']?.completedAt).toBe(T0 + 1);
  });

  it('caps stored attempts', () => {
    let s = createInitialProgress(T0);
    for (let i = 0; i < MAX_QUIZ_ATTEMPTS + 5; i++) {
      s = recordLessonQuiz(s, 'm00-l01', result(1, 10), T0 + i);
    }
    expect(s.quizAttempts).toHaveLength(MAX_QUIZ_ATTEMPTS);
    expect(s.quizAttempts.at(-1)?.at).toBe(T0 + MAX_QUIZ_ATTEMPTS + 4);
  });
});

describe('recordExam', () => {
  it('tracks best score, attempts and the first pass', () => {
    let s = recordExam(createInitialProgress(T0), 'm01', result(10, 15), T0);
    expect(s.exams.m01).toMatchObject({ attempts: 1, passedAt: undefined, lastAttemptAt: T0 });
    s = recordExam(s, 'm01', result(13, 15), T0 + 1);
    s = recordExam(s, 'm01', result(14, 15), T0 + 2);
    expect(s.exams.m01?.passedAt).toBe(T0 + 1);
    expect(s.exams.m01?.best).toBeCloseTo(14 / 15);
    expect(s.quizAttempts.map((a) => a.quizId)).toEqual(['m01-exam', 'm01-exam', 'm01-exam']);
    const f = recordExam(s, 'final', result(40, 40, 0.85), T0 + 3);
    expect(f.quizAttempts.at(-1)?.quizId).toBe('final');
  });
});

describe('migrateProgress', () => {
  it('returns a fresh state for garbage', () => {
    for (const junk of [null, undefined, 42, 'text', [], true]) {
      expect(migrateProgress(junk, 0, T0)).toEqual(createInitialProgress(T0));
    }
  });

  it('keeps valid data and round-trips a real state', () => {
    let s = recordLessonQuiz(createInitialProgress(T0), 'm00-l01', result(9, 10), T0);
    s = markLessonRead(s, 'm00-l01', T0);
    s = recordExam(s, 'm01', result(13, 15), T0);
    const roundTrip = migrateProgress(JSON.parse(JSON.stringify(s)), PROGRESS_VERSION, T0 + 999);
    expect(roundTrip).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('fills missing fields and drops corrupted ones', () => {
    const migrated = migrateProgress(
      {
        xp: -50,
        lessons: { 'm00-l01': { quizBest: 7, quizAttempts: 'x' }, 'm00-l02': 'broken' },
        activity: { '2026-09-25': { xp: 10 }, 'not-a-date': { xp: 1 } },
        streak: { current: 3, lastActiveDay: '2026-13-40' },
        counters: { calculatorsUsed: ['position', 5], glossaryViewed: 'edge' },
        quizAttempts: [{ quizId: 'm00-l01', at: 1 }, { nope: true }],
        achievements: { 'first-step': 123, bad: 'x' },
        profile: { name: 42 },
        extra: 'dropped',
      },
      0,
      T0,
    );
    expect(migrated.xp).toBe(0);
    expect(migrated.lessons['m00-l01']).toMatchObject({
      quizBest: 1,
      quizAttempts: 0,
      improvements: 0,
    });
    expect(migrated.lessons['m00-l02']).toBeUndefined();
    expect(Object.keys(migrated.activity)).toEqual(['2026-09-25']);
    expect(migrated.activity['2026-09-25']).toEqual({
      xp: 10,
      minutes: 0,
      lessonsCompleted: 0,
      quizzes: 0,
      simTrades: 0,
    });
    expect(migrated.streak).toMatchObject({ current: 3, lastActiveDay: null });
    expect(migrated.counters.calculatorsUsed).toEqual(['position']);
    expect(migrated.counters.glossaryViewed).toEqual([]);
    expect(migrated.quizAttempts).toHaveLength(1);
    expect(migrated.achievements).toEqual({ 'first-step': 123 });
    expect(migrated.profile).toEqual({ name: '', startedAt: T0, lastBackupAt: undefined });
    expect('extra' in migrated).toBe(false);
  });
});
