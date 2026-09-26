import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDatasetName, parseDataset } from '@/lib/trading/candles';
import { SIM_HISTORY, SIM_SKIP } from '@/lib/trading/simSession';
import { simulateTrade } from '@/lib/trading/simulate';
import { courseIndex } from './courseIndex';
import { getScenario, isDecisionCorrect, SCENARIOS } from './scenarios';

function load(name: string) {
  if (!isDatasetName(name)) throw new Error(`unknown dataset ${name}`);
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8'),
  );
  return parseDataset(name, raw).candles;
}

describe('simulator scenarios', () => {
  it('have unique ids, known lessons and datasets, and room for history and the skip reveal', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      expect(courseIndex.getLesson(s.lessonId), s.id).toBeDefined();
      expect(isDatasetName(s.dataset), s.id).toBe(true);
      const candles = load(s.dataset);
      expect(s.startIndex, s.id).toBeGreaterThanOrEqual(SIM_HISTORY - 1);
      expect(s.startIndex, s.id).toBeLessThanOrEqual(candles.length - 1 - SIM_SKIP);
      expect(s.expected === 'skip' || s.ideal !== undefined, s.id).toBe(true);
    }
  });

  it('textbook trades are valid and play out as the debrief says (take profit)', () => {
    for (const s of SCENARIOS) {
      if (s.expected === 'skip' || !s.ideal) continue;
      const candles = load(s.dataset);
      const entry = candles[s.startIndex]?.c ?? 0;
      const result = simulateTrade(candles, s.startIndex, {
        side: s.expected,
        entry,
        sl: s.ideal.sl,
        tp: s.ideal.tp,
        qty: 1,
      });
      expect(result?.outcome, s.id).toBe('tp');
    }
  });

  it('grades decisions against the textbook answer', () => {
    const skip = getScenario('m03-range-middle');
    expect(skip && isDecisionCorrect(skip, 'skip')).toBe(true);
    expect(skip && isDecisionCorrect(skip, 'long')).toBe(false);
    expect(getScenario('nope')).toBeUndefined();
  });
});
