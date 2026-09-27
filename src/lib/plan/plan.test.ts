import { describe, expect, it } from 'vitest';
import { createInitialProgress, PROGRESS_VERSION } from '@/lib/progress/initial';
import { migrateProgress } from '@/lib/progress/migrate';
import { cleanRules, sanitizePlan, sanitizeStrategy } from './plan';

describe('plan and strategy storage', () => {
  it('v2 → v3: older progress keeps everything and gets empty plan and strategy', () => {
    const v2 = { ...createInitialProgress(5), version: 2, xp: 321 } as Record<string, unknown>;
    delete v2.tradingPlan;
    delete v2.strategy;
    const migrated = migrateProgress(v2, 2, 10);
    expect(migrated).toMatchObject({
      version: PROGRESS_VERSION,
      xp: 321,
      tradingPlan: null,
      strategy: null,
    });
  });

  it('keeps a saved plan and strategy through a round trip', () => {
    const p = {
      ...createInitialProgress(5),
      tradingPlan: { sections: { goals: 'Цель', risk: '1%' }, updatedAt: 7 },
      strategy: { name: 'Моя TPS', rules: ['Правило 1', 'Правило 2'], updatedAt: 8 },
    };
    expect(migrateProgress(JSON.parse(JSON.stringify(p)), PROGRESS_VERSION, 10)).toEqual(p);
  });

  it('drops unknown sections, junk rules and oversized text', () => {
    expect(
      sanitizePlan({ sections: { goals: 'x'.repeat(5000), hacker: 'y' }, updatedAt: 'no' }),
    ).toEqual({
      sections: { goals: 'x'.repeat(4000) },
      updatedAt: 0,
    });
    expect(sanitizePlan('nope')).toBeNull();
    expect(sanitizeStrategy({ name: ' A ', rules: [' r1 ', 3, '', 'r2'] })).toEqual({
      name: 'A',
      rules: ['r1', 'r2'],
      updatedAt: 0,
    });
    expect(sanitizeStrategy({ name: 'A', rules: [] })).toBeNull();
    expect(cleanRules([' a ', '', '  '])).toEqual(['a']);
  });
});
