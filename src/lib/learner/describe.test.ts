import { describe, expect, it } from 'vitest';
import type { SkillState } from './gap';
import type { SkillKnowledge } from './knowledge';
import type { SkillBehaviour } from './behaviour';
import { knowledgeLevel, practiceLevel, summarize } from './describe';

const k = (p: number, answers = 5): SkillKnowledge => ({
  skill: 's',
  p,
  pAtLast: p,
  answers,
  correct: 0,
  lastAt: 0,
  mastered: false,
});
const b = (kept: number, trades: number): SkillBehaviour => ({
  skill: 's',
  rule: 'risk',
  alpha: 1,
  beta: 1,
  b: 0.5,
  trades,
  kept,
  lastAt: 0,
});

describe('knowledgeLevel', () => {
  it('names the level and waits for enough answers', () => {
    expect(knowledgeLevel({})).toBe('нет ответов');
    expect(knowledgeLevel({ knowledge: k(0.99, 2) })).toBe('мало данных');
    expect(knowledgeLevel({ knowledge: k(0.9) })).toBe('отлично');
    expect(knowledgeLevel({ knowledge: k(0.7) })).toBe('хорошо');
    expect(knowledgeLevel({ knowledge: k(0.5) })).toBe('базово');
    expect(knowledgeLevel({ knowledge: k(0.2) })).toBe('слабо');
  });
});

describe('practiceLevel', () => {
  it('is null without a rule and names how often the rule is kept', () => {
    expect(practiceLevel({ hasRule: false })).toBeNull();
    expect(practiceLevel({ hasRule: true })).toBe('нет сделок');
    expect(practiceLevel({ hasRule: true, behaviour: b(4, 4) })).toBe('соблюдается');
    expect(practiceLevel({ hasRule: true, behaviour: b(3, 4) })).toBe('чаще соблюдается');
    expect(practiceLevel({ hasRule: true, behaviour: b(1, 4) })).toBe('часто нарушается');
  });
});

describe('summarize', () => {
  it('counts mastered, gaps and started skills', () => {
    const s = (deficit: SkillState['deficit']): SkillState => ({
      skill: deficit,
      hasRule: false,
      significantGap: deficit === 'behaviour',
      deficit,
    });
    expect(summarize([s('new'), s('mastered'), s('behaviour'), s('learning')])).toEqual({
      total: 4,
      mastered: 1,
      gaps: 1,
      started: 3,
    });
  });
});
