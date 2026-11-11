import { describe, expect, it } from 'vitest';
import type { Deficit, SkillState } from './gap';
import { recommendStep } from './recommend';

const state = (skill: string, deficit: Deficit): SkillState => ({
  skill,
  deficit,
  hasRule: false,
  significantGap: deficit === 'behaviour',
});
const graph: Record<string, string[]> = { structure: ['candles'], levels: ['structure'] };
const requires = (id: string) => graph[id] ?? [];

describe('recommendStep', () => {
  it('a new learner just continues the course', () => {
    expect(recommendStep([state('candles', 'new'), state('risk', 'new')], [], requires)).toEqual({
      kind: 'course',
    });
  });

  it('a significant gap beats everything else', () => {
    const states = [state('candles', 'knowledge'), state('risk', 'behaviour')];
    expect(recommendStep(states, ['candles'], requires)).toEqual({ kind: 'gap', skill: 'risk' });
  });

  it('then due reviews, then theory, then practice', () => {
    const states = [
      state('candles', 'learning'),
      state('risk', 'practice'),
      state('levels', 'knowledge'),
    ];
    expect(recommendStep(states, ['candles'], requires)).toEqual({
      kind: 'review',
      skills: ['candles'],
    });
    expect(recommendStep(states, [], requires)).toEqual({
      kind: 'theory',
      skill: 'levels',
      misconception: false,
    });
    expect(recommendStep([state('risk', 'practice')], [], requires)).toEqual({
      kind: 'practice',
      skill: 'risk',
    });
  });

  it('offers a weak prerequisite before the skill built on it', () => {
    const states = [state('structure', 'knowledge'), state('levels', 'knowledge')];
    expect(recommendStep(states, [], requires)).toEqual({
      kind: 'theory',
      skill: 'structure',
      misconception: false,
    });
    // Order of the list does not matter for prerequisites.
    expect(recommendStep([...states].reverse(), [], requires)).toMatchObject({
      skill: 'structure',
    });
  });

  it('a confident mistake makes a skill weak and puts it first', () => {
    const known = { ...state('candles', 'learning'), knowledge: undefined };
    const withK = {
      ...state('risk', 'mastered'),
      knowledge: {
        skill: 'risk',
        p: 0.9,
        pAtLast: 0.9,
        answers: 5,
        correct: 4,
        lastAt: 0,
        mastered: true,
      },
    };
    const states = [state('levels', 'knowledge'), known, withK];
    expect(recommendStep(states, [], requires, new Set(['risk']))).toEqual({
      kind: 'theory',
      skill: 'risk',
      misconception: true,
    });
    // A skill without answers cannot hold a misconception.
    expect(recommendStep([known], [], requires, new Set(['candles']))).toEqual({ kind: 'course' });
  });
});
