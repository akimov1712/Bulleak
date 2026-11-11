import { describe, expect, it } from 'vitest';
import type { Skill } from '@/types/learner';
import { createSkillIndex, skillGraphProblems, topologicalOrder } from './skills';

const skill = (id: string, tags: string[], requires: string[] = []): Skill => ({
  id,
  title: id,
  group: 'chart',
  tags,
  lessons: ['m03-l01'],
  requires,
});

const graph = [
  skill('levels', ['support', 'resistance'], ['structure']),
  skill('candles', ['candlestick', 'wick']),
  skill('structure', ['trend', 'support'], ['candles']),
];

describe('skill graph', () => {
  it('orders prerequisites first and keeps graph order otherwise', () => {
    expect(topologicalOrder(graph)).toEqual(['candles', 'structure', 'levels']);
  });

  it('accepts a valid graph', () => {
    expect(skillGraphProblems(graph)).toEqual([]);
  });

  it('reports cycles, unknown prerequisites and empty fields', () => {
    expect(skillGraphProblems([skill('a', ['x'], ['b']), skill('b', ['y'], ['a'])])).toEqual([
      'prerequisites form a cycle',
    ]);
    expect(topologicalOrder([skill('a', ['x'], ['b']), skill('b', ['y'], ['a'])])).toBeNull();
    expect(skillGraphProblems([skill('a', ['x'], ['ghost'])])).toEqual([
      'a: unknown prerequisite ghost',
    ]);
    expect(skillGraphProblems([skill('a', ['x'], ['a'])])).toContain('a: requires itself');
    expect(skillGraphProblems([skill('a', [])])).toEqual(['a: no tags']);
    expect(skillGraphProblems([skill('a', ['x', 'x'])])).toEqual(['a: duplicate tag']);
    expect(skillGraphProblems([skill('a', ['x']), skill('a', ['y'])])).toEqual(['a: duplicate id']);
    expect(skillGraphProblems([skill('Bad_id', ['x'])])).toEqual(['Bad_id: id is not kebab-case']);
    expect(skillGraphProblems([{ ...skill('a', ['x']), lessons: [] }])).toEqual(['a: no lessons']);
  });
});

describe('skill index', () => {
  const index = createSkillIndex(graph);

  it('maps question tags to skills in graph order without repeats', () => {
    expect(index.skillsOfTags(['support'])).toEqual(['levels', 'structure']);
    expect(index.skillsOfTags(['wick', 'trend', 'support'])).toEqual([
      'levels',
      'candles',
      'structure',
    ]);
    expect(index.skillsOfTags(['unknown'])).toEqual([]);
  });

  it('lists terms, order and prerequisites', () => {
    expect(index.termsOf('candles', (t) => t === 'wick')).toEqual(['wick']);
    expect(index.termsOf('ghost', () => true)).toEqual([]);
    expect(index.order).toEqual(['candles', 'structure', 'levels']);
    expect(index.getSkill('levels')?.requires).toEqual(['structure']);
    expect(index.prerequisitesMet('levels', (id) => id === 'structure')).toBe(true);
    expect(index.prerequisitesMet('levels', () => false)).toBe(false);
    expect(index.prerequisitesMet('candles', () => false)).toBe(true);
  });
});
