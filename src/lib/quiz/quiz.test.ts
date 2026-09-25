import { describe, expect, it } from 'vitest';
import type { Question, Quiz } from '@/types/quiz';
import { gradeQuestion, gradeQuiz } from './grade';
import { prepareQuiz, stratifiedSample } from './prepare';
import { mulberry32 } from '@/lib/random';

const base = { explanation: 'e', tags: ['t'] };
const single: Question = {
  ...base,
  id: 's',
  type: 'single',
  prompt: '?',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ],
  correct: 'b',
};
const multi: Question = {
  ...base,
  id: 'm',
  type: 'multi',
  prompt: '?',
  options: single.options,
  correct: ['a', 'c'],
};
const tf: Question = { ...base, id: 'tf', type: 'truefalse', prompt: '?', correct: false };
const numeric: Question = {
  ...base,
  id: 'n',
  type: 'numeric',
  prompt: '?',
  correct: 0.01,
  tolerance: 0.0005,
};
const priceClick: Question = {
  ...base,
  id: 'cp',
  type: 'chart-click',
  prompt: '?',
  dataset: 'BTCUSDT-240',
  from: 0,
  to: 50,
  target: { kind: 'price', min: 100, max: 110 },
};
const candleClick: Question = {
  ...priceClick,
  id: 'cc',
  target: { kind: 'candle', indices: [3, 4] },
};
const match: Question = {
  ...base,
  id: 'ma',
  type: 'match',
  prompt: '?',
  pairs: [
    { left: 'L1', right: 'R1' },
    { left: 'L2', right: 'R2' },
    { left: 'L3', right: 'R3' },
  ],
};
const order: Question = {
  ...base,
  id: 'o',
  type: 'order',
  prompt: '?',
  items: ['1', '2', '3', '4'],
};

describe('gradeQuestion', () => {
  it('single', () => {
    expect(gradeQuestion(single, 'b')).toBe(true);
    expect(gradeQuestion(single, 'a')).toBe(false);
    expect(gradeQuestion(single, undefined)).toBe(false);
  });

  it('multi requires the exact set (order does not matter)', () => {
    expect(gradeQuestion(multi, ['c', 'a'])).toBe(true);
    expect(gradeQuestion(multi, ['a'])).toBe(false);
    expect(gradeQuestion(multi, ['a', 'b', 'c'])).toBe(false);
    expect(gradeQuestion(multi, ['a', 'a'])).toBe(false);
    expect(gradeQuestion(multi, 'a')).toBe(false);
    expect(gradeQuestion(multi, [])).toBe(false);
  });

  it('truefalse compares booleans strictly', () => {
    expect(gradeQuestion(tf, false)).toBe(true);
    expect(gradeQuestion(tf, true)).toBe(false);
    expect(gradeQuestion(tf, 'false')).toBe(false);
    expect(gradeQuestion(tf, undefined)).toBe(false);
  });

  it('numeric honours tolerance at the boundary', () => {
    expect(gradeQuestion(numeric, 0.01)).toBe(true);
    expect(gradeQuestion(numeric, 0.0105)).toBe(true);
    expect(gradeQuestion(numeric, 0.0095)).toBe(true);
    expect(gradeQuestion(numeric, 0.0106)).toBe(false);
    expect(gradeQuestion(numeric, Number.NaN)).toBe(false);
    expect(gradeQuestion(numeric, '0.01')).toBe(false);
    expect(gradeQuestion({ ...numeric, correct: 1234.5, tolerance: 0 }, 1234.5)).toBe(true);
  });

  it('chart-click by price range and by candle', () => {
    expect(gradeQuestion(priceClick, { price: 100 })).toBe(true);
    expect(gradeQuestion(priceClick, { price: 110 })).toBe(true);
    expect(gradeQuestion(priceClick, { price: 110.01 })).toBe(false);
    expect(gradeQuestion(priceClick, { candle: 3 })).toBe(false);
    expect(gradeQuestion(candleClick, { candle: 4 })).toBe(true);
    expect(gradeQuestion(candleClick, { candle: 5 })).toBe(false);
    expect(gradeQuestion(candleClick, null)).toBe(false);
  });

  it('match requires every pair', () => {
    expect(gradeQuestion(match, { L1: 'R1', L2: 'R2', L3: 'R3' })).toBe(true);
    expect(gradeQuestion(match, { L1: 'R1', L2: 'R3', L3: 'R2' })).toBe(false);
    expect(gradeQuestion(match, { L1: 'R1', L2: 'R2' })).toBe(false);
    expect(gradeQuestion(match, null)).toBe(false);
  });

  it('order requires the exact sequence', () => {
    expect(gradeQuestion(order, ['1', '2', '3', '4'])).toBe(true);
    expect(gradeQuestion(order, ['2', '1', '3', '4'])).toBe(false);
    expect(gradeQuestion(order, ['1', '2', '3'])).toBe(false);
  });
});

describe('gradeQuiz pass threshold (80%)', () => {
  function quizOf(n: number): Question[] {
    return Array.from({ length: n }, (_, i) => ({ ...tf, id: `q${i}` }));
  }
  function answers(n: number, correct: number) {
    return Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`q${i}`, i < correct ? false : true]),
    );
  }

  it.each([
    [10, 8, true],
    [10, 7, false],
    [12, 9, false],
    [12, 10, true],
    [15, 12, true],
    [15, 11, false],
    [8, 7, true],
    [8, 6, false],
  ])('%s questions, %s correct → passed=%s', (n, correct, passed) => {
    const r = gradeQuiz('x', quizOf(n), answers(n, correct), 0.8);
    expect(r.correct).toBe(correct);
    expect(r.passed).toBe(passed);
  });

  it('empty quiz never passes', () => {
    expect(gradeQuiz('x', [], {}, 0.8)).toMatchObject({ total: 0, ratio: 0, passed: false });
  });

  it('reports per-question results with tags', () => {
    const r = gradeQuiz('x', [single, tf], { s: 'b' }, 0.8);
    expect(r.perQuestion).toEqual([
      { id: 's', correct: true, tags: ['t'] },
      { id: 'tf', correct: false, tags: ['t'] },
    ]);
  });
});

describe('prepareQuiz', () => {
  const quiz: Quiz = {
    id: 'z',
    kind: 'lesson',
    passRatio: 0.8,
    questions: [single, multi, tf, numeric, match, order],
  };

  it('is deterministic per seed and keeps every question', () => {
    const a = prepareQuiz(quiz, 42);
    const b = prepareQuiz(quiz, 42);
    expect(a).toEqual(b);
    expect(a.questions.map((q) => q.id).sort()).toEqual(quiz.questions.map((q) => q.id).sort());
  });

  it('shuffles options but keeps the same option set', () => {
    const q = prepareQuiz(quiz, 7).questions.find((x) => x.id === 's');
    if (q?.type !== 'single') throw new Error('expected single');
    expect(q.options.map((o) => o.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('never presents match/order questions already solved', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const q of prepareQuiz(quiz, seed).questions) {
        if (q.type === 'order') expect(q.shuffled).not.toEqual(q.items);
        if (q.type === 'match') expect(q.rights).not.toEqual(q.pairs.map((p) => p.right));
      }
    }
  });

  it('samples exam pools across topics', () => {
    const pool: Question[] = ['a', 'b', 'c'].flatMap((tag) =>
      Array.from({ length: 10 }, (_, i) => ({ ...tf, id: `${tag}${i}`, tags: [tag] })),
    );
    const picked = stratifiedSample(pool, 9, mulberry32(1));
    expect(picked).toHaveLength(9);
    expect(new Set(picked.map((q) => q.id)).size).toBe(9);
    for (const tag of ['a', 'b', 'c'])
      expect(picked.filter((q) => q.tags[0] === tag)).toHaveLength(3);
    expect(prepareQuiz({ ...quiz, questions: pool, sample: 5 }, 3).questions).toHaveLength(5);
    expect(stratifiedSample(pool, 100, mulberry32(1))).toHaveLength(30);
  });
});
