import { describe, expect, it } from 'vitest';
import type { Question } from '@/types/quiz';
import {
  applyHints,
  hintLevels,
  hintTermId,
  nextHintLevel,
  nudgeHiddenOptions,
  withoutHiddenOptions,
} from './ladder';

const base = { prompt: 'p', explanation: 'explanation long enough', tags: ['leverage', 'margin'] };
const single: Question = {
  ...base,
  id: 's',
  type: 'single',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
    { id: 'd', text: 'D' },
  ],
  correct: 'c',
};
const multi: Question = {
  ...base,
  id: 'm',
  type: 'multi',
  options: single.type === 'single' ? single.options : [],
  correct: ['a', 'd'],
};
const numeric: Question = { ...base, id: 'n', type: 'numeric', correct: 5, tolerance: 0 };

describe('hint ladder', () => {
  it('choice questions start with the nudge, others with the rule', () => {
    expect(hintLevels(single)).toEqual([1, 2, 3]);
    expect(hintLevels(numeric)).toEqual([2, 3]);
    expect(nextHintLevel(single, undefined)).toBe(1);
    expect(nextHintLevel(numeric, undefined)).toBe(2);
    expect(nextHintLevel(single, 2)).toBe(3);
    expect(nextHintLevel(single, 3)).toBeNull();
  });

  it('the nudge keeps the right answers and one wrong option', () => {
    expect(nudgeHiddenOptions(single)).toEqual(['b', 'd']);
    expect(nudgeHiddenOptions(multi)).toEqual(['c']);
    expect(nudgeHiddenOptions(numeric)).toEqual([]);
  });

  it('the rule is the first tag', () => {
    expect(hintTermId(single)).toBe('leverage');
  });
});

describe('applyHints / withoutHiddenOptions', () => {
  const result = {
    quizId: 'q',
    correct: 2,
    total: 2,
    ratio: 1,
    passed: true,
    perQuestion: [
      { id: 'a', correct: true, tags: [] },
      { id: 'b', correct: true, tags: [] },
    ],
  };

  it('a walkthrough answer does not count; marks are attached', () => {
    const r = applyHints(result, { a: 3, b: 1 }, { b: 'sure' }, 0.8);
    expect(r.perQuestion).toEqual([
      { id: 'a', correct: false, tags: [], hint: 3 },
      { id: 'b', correct: true, tags: [], hint: 1, conf: 'sure' },
    ]);
    expect(r).toMatchObject({ correct: 1, ratio: 0.5, passed: false });
  });

  it('drops options the nudge hid from the answer', () => {
    expect(withoutHiddenOptions(single, 'b', '')).toBe('');
    expect(withoutHiddenOptions(single, 'c', '')).toBe('c');
    expect(withoutHiddenOptions(multi, ['a', 'c'], [])).toEqual(['a']);
    expect(withoutHiddenOptions(numeric, 7, null)).toBe(7);
  });
});
