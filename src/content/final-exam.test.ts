import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDatasetName, parseDataset } from '@/lib/trading/candles';
import { finalExam, PRACTICAL_SCENARIOS } from './final-exam';

describe('final exam', () => {
  it('pools every module exam: ≥ 60 unique questions, 40 per attempt, pass 85 %', () => {
    expect(finalExam.id).toBe('final');
    expect(finalExam.questions.length).toBeGreaterThanOrEqual(60);
    expect(new Set(finalExam.questions.map((q) => q.id)).size).toBe(finalExam.questions.length);
    expect(finalExam.sample).toBe(40);
    expect(finalExam.passRatio).toBe(0.85);
    // questions from the first and the last module exam are both in the pool
    expect(finalExam.questions.some((q) => q.id.startsWith('m01-e'))).toBe(true);
    expect(finalExam.questions.some((q) => q.id.startsWith('m12-e'))).toBe(true);
  });

  it('practical scenarios point at real history with room for the chart', () => {
    expect(PRACTICAL_SCENARIOS).toHaveLength(3);
    expect(new Set(PRACTICAL_SCENARIOS.map((s) => s.expected))).toEqual(
      new Set(['long', 'short', 'skip']),
    );
    for (const s of PRACTICAL_SCENARIOS) {
      expect(isDatasetName(s.dataset), s.id).toBe(true);
      if (!isDatasetName(s.dataset)) continue;
      const raw: unknown = JSON.parse(
        fs.readFileSync(path.resolve('public/data', `${s.dataset}.json`), 'utf8'),
      );
      const candles = parseDataset(s.dataset, raw).candles;
      expect(s.startIndex, s.id).toBeGreaterThanOrEqual(90);
      expect(s.startIndex, s.id).toBeLessThan(candles.length);
      expect(s.task.length, s.id).toBeGreaterThan(50);
      expect(s.debrief.length, s.id).toBeGreaterThan(50);
    }
  });
});
