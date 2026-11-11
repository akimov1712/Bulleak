import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/random';
import type { AnswerEvent } from './events';
import {
  bktStep,
  DEFAULT_BKT,
  forget,
  FORGET_HALF_LIFE_DAYS,
  guessChance,
  knowledgeBySkill,
} from './knowledge';

const DAY = 86_400_000;
const answer = (
  at: number,
  ok: boolean,
  skills = ['risk'],
  patch: Partial<AnswerEvent> = {},
): AnswerEvent => ({
  kind: 'answer',
  at,
  quizId: 'm09-l01',
  ok,
  skills,
  ...patch,
});

describe('bktStep', () => {
  it('matches the textbook update', () => {
    // posterior = 0.2·0.9 / (0.2·0.9 + 0.8·0.25) = 0.18 / 0.38; then + (1 − posterior)·0.15
    const posterior = 0.18 / 0.38;
    expect(bktStep(0.2, true, 0.25)).toBeCloseTo(posterior + (1 - posterior) * 0.15, 12);
    // wrong: 0.2·0.1 / (0.02 + 0.8·0.75)
    const wrong = 0.02 / (0.02 + 0.6);
    expect(bktStep(0.2, false, 0.25)).toBeCloseTo(wrong + (1 - wrong) * 0.15, 12);
  });

  it('a right answer raises K, a wrong one lowers it, easy guesses tell less', () => {
    expect(bktStep(0.5, true, 0.25)).toBeGreaterThan(0.5);
    expect(bktStep(0.5, false, 0.25)).toBeLessThan(0.5);
    expect(bktStep(0.5, true, 0.5)).toBeLessThan(bktStep(0.5, true, 0.05));
  });

  it('stays within [0, 1] on random input', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const p = bktStep(rng(), rng() < 0.5, rng());
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe('guessChance', () => {
  it('depends on the question type', () => {
    expect(guessChance('truefalse')).toBe(0.5);
    expect(guessChance('single')).toBe(0.25);
    expect(guessChance('numeric')).toBe(0.05);
    expect(guessChance(undefined)).toBe(DEFAULT_BKT.pG);
  });
});

describe('forget', () => {
  it('halves the part above pL0 every half-life and never goes below pL0', () => {
    const p0 = DEFAULT_BKT.pL0;
    expect(forget(0.9, FORGET_HALF_LIFE_DAYS * DAY)).toBeCloseTo(p0 + (0.9 - p0) / 2, 12);
    expect(forget(0.9, 0)).toBe(0.9);
    expect(forget(0.1, 365 * DAY)).toBe(0.1);
    expect(forget(0.9, 365 * DAY)).toBeGreaterThan(p0);
  });
});

describe('knowledgeBySkill', () => {
  it('counts answers per skill and marks mastery after enough right answers', () => {
    const events = [1, 2, 3, 4, 5].map((i) => answer(i, true, ['risk', 'size']));
    const k = knowledgeBySkill(events, 6);
    expect(k.get('risk')).toMatchObject({ answers: 5, correct: 5, lastAt: 5, mastered: true });
    expect(k.get('size')?.p).toBeCloseTo(k.get('risk')?.p ?? 0, 12);
    expect(k.has('other')).toBe(false);
  });

  it('needs at least three answers for mastery', () => {
    const k = knowledgeBySkill(
      [
        answer(1, true, ['risk'], { type: 'numeric' }),
        answer(2, true, ['risk'], { type: 'numeric' }),
      ],
      3,
    );
    expect(k.get('risk')?.p).toBeGreaterThan(0.85);
    expect(k.get('risk')?.mastered).toBe(false);
  });

  it('wrong answers keep K low', () => {
    const k = knowledgeBySkill(
      [1, 2, 3, 4].map((i) => answer(i, false)),
      5,
    );
    expect(k.get('risk')?.p).toBeLessThan(DEFAULT_BKT.pL0 + DEFAULT_BKT.pT);
    expect(k.get('risk')?.mastered).toBe(false);
  });

  it('forgets after the last answer: p drops, pAtLast stays', () => {
    const events = [1, 2, 3, 4, 5].map((i) => answer(i, true));
    const fresh = knowledgeBySkill(events, 6).get('risk');
    const later = knowledgeBySkill(events, 6 + 90 * DAY).get('risk');
    expect(later?.pAtLast).toBe(fresh?.pAtLast);
    expect(later?.p).toBeLessThan(fresh?.p ?? 0);
    expect(later?.mastered).toBe(false);
  });

  it('uses per-skill parameters', () => {
    const k = knowledgeBySkill([answer(1, true)], 2, () => ({ ...DEFAULT_BKT, pL0: 0.6 }));
    expect(k.get('risk')?.p).toBeGreaterThan(
      knowledgeBySkill([answer(1, true)], 2).get('risk')?.p ?? 1,
    );
  });
});
