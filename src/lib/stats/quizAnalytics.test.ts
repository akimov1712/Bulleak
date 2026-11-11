import { describe, expect, it } from 'vitest';
import type { AnswerEvent } from '@/lib/learner/events';
import { answerTiming, confusedSkills, frequentMistakes, lessonOfQuestion } from './quizAnalytics';

const e = (
  at: number,
  q: string,
  ok: boolean,
  skills: string[],
  extra: Partial<AnswerEvent> = {},
): AnswerEvent => ({
  kind: 'answer',
  at,
  quizId: 'm03-l04',
  questionId: q,
  ok,
  skills,
  ...extra,
});

describe('frequentMistakes', () => {
  it('lists questions wrong at least twice and whether the last try was right', () => {
    const list = frequentMistakes([
      e(1, 'a', false, []),
      e(2, 'a', false, []),
      e(3, 'a', true, []),
      e(1, 'b', false, []),
      e(2, 'c', false, []),
      e(3, 'c', false, []),
      e(4, 'c', false, []),
    ]);
    expect(list).toEqual([
      { questionId: 'c', wrong: 3, answers: 3, fixed: false },
      { questionId: 'a', wrong: 2, answers: 3, fixed: true },
    ]);
  });
});

describe('confusedSkills', () => {
  it('pairs skills wrong in the same attempts', () => {
    const pairs = confusedSkills([
      e(1, 'q1', false, ['levels']),
      e(1, 'q2', false, ['liquidity']),
      e(2, 'q1', false, ['levels', 'liquidity']),
      e(3, 'q3', false, ['levels']),
      e(3, 'q4', true, ['candles']),
    ]);
    expect(pairs).toEqual([{ a: 'levels', b: 'liquidity', together: 2 }]);
  });
});

describe('answerTiming', () => {
  it('gives the median per type and counts rushed wrong answers', () => {
    const t = answerTiming([
      e(1, 'a', true, [], { type: 'single', sec: 10 }),
      e(1, 'b', false, [], { type: 'single', sec: 2 }),
      e(1, 'c', true, [], { type: 'single', sec: 20 }),
      e(1, 'd', true, [], { type: 'numeric', sec: 30 }),
      e(1, 'e', false, [], { type: 'numeric', sec: 40 }),
      e(1, 'f', false, []),
    ]);
    expect(t.byType).toEqual([
      { type: 'single', answers: 3, medianSec: 10 },
      { type: 'numeric', answers: 2, medianSec: 35 },
    ]);
    expect(t.rushedWrong).toBe(1);
    expect(t.timed).toBe(5);
  });
});

describe('lessonOfQuestion', () => {
  it('maps lesson questions to their lesson', () => {
    expect(lessonOfQuestion('m03-l01-q4')).toBe('m03-l01');
    expect(lessonOfQuestion('m03-e01')).toBeNull();
  });
});
