import { describe, expect, it } from 'vitest';
import type { Confidence } from '@/types/quiz';
import type { AnswerEvent } from './events';
import { calibration, misconceptions } from './calibration';

const e = (at: number, ok: boolean, conf?: Confidence, skills = ['risk']): AnswerEvent => ({
  kind: 'answer',
  at,
  quizId: 'q',
  ok,
  skills,
  ...(conf && { conf }),
});

describe('calibration', () => {
  it('counts right answers per confidence mark and skips unmarked ones', () => {
    expect(
      calibration([e(1, true, 'sure'), e(2, false, 'sure'), e(3, true, 'guess'), e(4, true)]),
    ).toEqual({
      sure: { answers: 2, correct: 1 },
      unsure: { answers: 0, correct: 0 },
      guess: { answers: 1, correct: 1 },
    });
  });
});

describe('misconceptions', () => {
  it('a confident mistake opens one until a later right answer', () => {
    expect([...misconceptions([e(1, false, 'sure')])]).toEqual(['risk']);
    expect([...misconceptions([e(1, false, 'sure'), e(2, true)])]).toEqual([]);
    expect([...misconceptions([e(1, false, 'unsure'), e(2, false)])]).toEqual([]);
    expect([...misconceptions([e(1, true), e(2, false, 'sure', ['risk', 'size'])])]).toEqual([
      'risk',
      'size',
    ]);
  });
});
