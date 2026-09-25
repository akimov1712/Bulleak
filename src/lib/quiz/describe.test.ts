import { describe, expect, it } from 'vitest';
import type { Question } from '@/types/quiz';
import { correctAnswerText, isAnswered, questionHint } from './describe';

const base = { id: 'q', prompt: '?', explanation: 'e', tags: [] };
const qs: Record<string, Question> = {
  single: {
    ...base,
    type: 'single',
    options: [
      { id: 'a', text: 'Лимит' },
      { id: 'b', text: 'Маркет' },
    ],
    correct: 'b',
  },
  multi: {
    ...base,
    type: 'multi',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
    ],
    correct: ['a', 'c'],
  },
  truefalse: { ...base, type: 'truefalse', correct: false },
  numeric: { ...base, type: 'numeric', correct: 1268.25, tolerance: 5, unit: '$' },
  price: {
    ...base,
    type: 'chart-click',
    dataset: 'x',
    from: 0,
    to: 1,
    target: { kind: 'price', min: 100, max: 110 },
  },
  candle: {
    ...base,
    type: 'chart-click',
    dataset: 'x',
    from: 0,
    to: 1,
    target: { kind: 'candle', indices: [1] },
  },
  match: {
    ...base,
    type: 'match',
    pairs: [
      { left: 'PoW', right: 'Bitcoin' },
      { left: 'PoS', right: 'Ethereum' },
    ],
  },
  order: { ...base, type: 'order', items: ['Теория', 'Тренажёр'] },
};

describe('correctAnswerText', () => {
  it('describes each type', () => {
    expect(correctAnswerText(qs.single as Question)).toBe('Маркет');
    expect(correctAnswerText(qs.multi as Question)).toBe('A; C');
    expect(correctAnswerText(qs.truefalse as Question)).toBe('Неверно');
    expect(correctAnswerText(qs.numeric as Question).replace(/\s/g, ' ')).toBe('1 268,25 $');
    expect(correctAnswerText(qs.price as Question)).toBe('зона 100,00 – 110,00');
    expect(correctAnswerText(qs.candle as Question)).toBe('отмеченная свеча на графике');
    expect(correctAnswerText(qs.match as Question)).toBe('PoW → Bitcoin; PoS → Ethereum');
    expect(correctAnswerText(qs.order as Question)).toBe('1. Теория → 2. Тренажёр');
  });
});

describe('isAnswered', () => {
  it('requires a complete answer', () => {
    expect(isAnswered(qs.single as Question, undefined)).toBe(false);
    expect(isAnswered(qs.single as Question, 'a')).toBe(true);
    expect(isAnswered(qs.multi as Question, [])).toBe(false);
    expect(isAnswered(qs.multi as Question, ['a'])).toBe(true);
    expect(isAnswered(qs.truefalse as Question, false)).toBe(true);
    expect(isAnswered(qs.numeric as Question, null)).toBe(false);
    expect(isAnswered(qs.numeric as Question, 0)).toBe(true);
    expect(isAnswered(qs.price as Question, { price: 1 })).toBe(true);
    expect(isAnswered(qs.match as Question, { PoW: 'Bitcoin' })).toBe(false);
    expect(isAnswered(qs.match as Question, { PoW: 'Bitcoin', PoS: 'Bitcoin' })).toBe(true);
    expect(isAnswered(qs.order as Question, ['Тренажёр', 'Теория'])).toBe(true);
    expect(isAnswered(qs.order as Question, undefined)).toBe(false);
  });

  it('every type has a hint', () => {
    for (const q of Object.values(qs)) expect(questionHint(q).length).toBeGreaterThan(3);
  });
});
