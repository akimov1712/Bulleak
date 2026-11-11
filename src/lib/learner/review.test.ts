import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/random';
import type { Question } from '@/types/quiz';
import type { AnswerEvent } from './events';
import type { SkillKnowledge } from './knowledge';
import {
  answerHistory,
  dueReviews,
  pickReviewQuestions,
  reviewLessons,
  reviewSchedule,
} from './review';

const DAY = 86_400_000;
const session = (
  at: number,
  skill: string,
  ok: number,
  total: number,
  quizId = 'q',
): AnswerEvent[] =>
  Array.from({ length: total }, (_, i) => ({
    kind: 'answer',
    at,
    quizId,
    questionId: `${skill}-${at}-${i}`,
    ok: i < ok,
    skills: [skill],
  }));

describe('reviewSchedule', () => {
  it('moves to the next interval after a good session and back to the first after a bad one', () => {
    const s1 = reviewSchedule(session(0, 'risk', 5, 5)).get('risk');
    expect(s1).toEqual({ skill: 'risk', step: 0, lastAt: 0, dueAt: DAY });
    const s2 = reviewSchedule([...session(0, 'risk', 5, 5), ...session(DAY, 'risk', 4, 5)]);
    expect(s2.get('risk')).toMatchObject({ step: 1, dueAt: DAY + 3 * DAY });
    const s3 = reviewSchedule([
      ...session(0, 'risk', 5, 5),
      ...session(DAY, 'risk', 5, 5),
      ...session(4 * DAY, 'risk', 2, 5),
    ]);
    expect(s3.get('risk')).toMatchObject({ step: 0, lastAt: 4 * DAY, dueAt: 5 * DAY });
  });

  it('stops at the longest interval', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      session(i * 100 * DAY, 'risk', 1, 1),
    ).flat();
    expect(reviewSchedule(events).get('risk')?.step).toBe(5);
  });

  it('separates attempts of the same moment by quiz', () => {
    const s = reviewSchedule([...session(0, 'risk', 1, 1, 'a'), ...session(0, 'risk', 0, 1, 'b')]);
    expect(s.get('risk')?.step).toBe(0);
  });
});

const k = (skill: string, p: number, pAtLast = p): SkillKnowledge => ({
  skill,
  p,
  pAtLast,
  answers: 5,
  correct: 5,
  lastAt: 0,
  mastered: p >= 0.85,
});

describe('dueReviews', () => {
  it('lists overdue skills only, most urgent first, at most three', () => {
    const schedule = reviewSchedule([
      ...session(0, 'a', 5, 5),
      ...session(0, 'b', 5, 5),
      ...session(-DAY, 'c', 5, 5),
      ...session(-DAY, 'd', 5, 5),
      ...session(10 * DAY, 'fresh', 5, 5),
      ...session(10 * DAY, 'forgot', 5, 5),
    ]);
    const knowledge = new Map([
      ['a', k('a', 0.9)],
      ['b', k('b', 0.5)],
      ['c', k('c', 0.9)],
      ['d', k('d', 0.9)],
      ['fresh', k('fresh', 0.9)],
      ['forgot', k('forgot', 0.6, 0.9)],
    ]);
    expect(dueReviews(schedule, knowledge, 10 * DAY + 1).map((r) => r.skill)).toEqual([
      'c',
      'd',
      'b',
    ]);
    expect(dueReviews(schedule, knowledge, 10 * DAY + 1, 10).map((r) => r.skill)).toEqual([
      'c',
      'd',
      'b',
      'a',
    ]);
    expect(dueReviews(schedule, new Map(), -1)).toEqual([]);
  });
});

describe('reviewLessons', () => {
  it('keeps only studied lessons of the skills, without repeats', () => {
    const lessonsOf = (s: string) =>
      ({ risk: ['m09-l01', 'm09-l05'], size: ['m09-l02', 'm09-l01'] })[s] ?? [];
    const studied = (l: string) => l !== 'm09-l05';
    expect(reviewLessons(['risk', 'size'], lessonsOf, studied)).toEqual(['m09-l01', 'm09-l02']);
    expect(reviewLessons(['risk'], lessonsOf, () => false)).toEqual([]);
  });
});

const q = (id: string, tags: string[]): Question => ({
  id,
  type: 'truefalse',
  prompt: id,
  explanation: 'explanation long enough',
  tags,
  correct: true,
});

describe('pickReviewQuestions', () => {
  const pool = [
    q('r1', ['risk']),
    q('r2', ['risk']),
    q('r3', ['risk']),
    q('s1', ['size']),
    q('both', ['risk', 'size']),
    q('other', ['candles']),
  ];
  const skillsOf = (x: Question) => x.tags;

  it('takes questions round-robin across skills without repeats or foreign skills', () => {
    const picked = pickReviewQuestions(pool, ['risk', 'size'], skillsOf, new Map(), mulberry32(1));
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((x) => x.id)).size).toBe(5);
    expect(picked.map((x) => x.id)).not.toContain('other');
  });

  it('puts last-time mistakes first, then unseen, then the oldest right answers', () => {
    const history = new Map([
      ['r1', { at: 5, ok: true }],
      ['r2', { at: 1, ok: true }],
      ['r3', { at: 9, ok: false }],
    ]);
    const picked = pickReviewQuestions(pool, ['risk'], skillsOf, history, mulberry32(3), 4);
    expect(picked.map((x) => x.id)).toEqual(['r3', 'both', 'r2', 'r1']);
  });

  it('returns fewer when the pool is small', () => {
    expect(pickReviewQuestions(pool, ['size'], skillsOf, new Map(), mulberry32(1), 5)).toHaveLength(
      2,
    );
  });
});

describe('answerHistory', () => {
  it('keeps the latest answer per question', () => {
    const h = answerHistory([
      { kind: 'answer', at: 1, quizId: 'x', questionId: 'a', ok: false, skills: [] },
      { kind: 'answer', at: 2, quizId: 'x', questionId: 'a', ok: true, skills: [] },
      { kind: 'answer', at: 3, quizId: 'x', ok: false, skills: [] },
    ]);
    expect([...h]).toEqual([['a', { at: 2, ok: true }]]);
  });
});
