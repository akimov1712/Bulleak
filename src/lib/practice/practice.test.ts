import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import { mulberry32 } from '@/lib/random';
import { SITUATIONS } from '@/content/practice/situations';
import { checkDrill, DRILL_KINDS, EMPTY_DRILL_STATS, generateDrill, recordDrill } from './drills';
import { disciplineScore, situationProblems } from './situations';
import {
  brier,
  FORECAST_HISTORY,
  FORECAST_HORIZON,
  forecastOutcome,
  forecastSetup,
  pickForecastMoment,
  summarizeForecasts,
  type ForecastAttempt,
} from './forecast';

describe('skill drills', () => {
  it.each(DRILL_KINDS)('%s: generated tasks are solvable and checked with tolerance', (kind) => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const drill = generateDrill(kind, rng);
      expect(Number.isFinite(drill.answer)).toBe(true);
      expect(drill.prompt.length).toBeGreaterThan(20);
      expect(checkDrill(drill, drill.answer)).toBe(true);
      expect(checkDrill(drill, drill.answer + drill.tolerance * 3 + 1)).toBe(false);
      expect(checkDrill(drill, null)).toBe(false);
    }
  });

  it('position size does not depend on leverage: risk / stop distance', () => {
    const rng = mulberry32(1);
    const drill = generateDrill('size', rng);
    const risk = Number(/риск ([\d,]+) %/.exec(drill.prompt)?.[1]?.replace(',', '.'));
    expect(risk).toBeGreaterThan(0);
    expect(drill.explanation).toContain('Плечо на размер позиции не влияет');
  });

  it('keeps the streak and the best streak', () => {
    let s = EMPTY_DRILL_STATS;
    for (const ok of [true, true, false, true]) s = recordDrill(s, ok);
    expect(s).toEqual({ done: 4, correct: 3, streak: 1, best: 2 });
  });
});

const flat = (n: number, close = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    o: close,
    h: close + 1,
    l: close - 1,
    c: close,
    v: 1,
  }));

describe('forecast', () => {
  it('reads up, down and range against the ATR band', () => {
    const candles = flat(200);
    const setup = forecastSetup(candles, 150);
    expect(setup).not.toBeNull();
    if (!setup) return;
    expect(setup.band).toBeCloseTo(3); // ATR 2 × 1.5
    const at = (price: number) => {
      const copy = candles.map((c) => ({ ...c }));
      const later = copy[150 + FORECAST_HORIZON];
      if (later) later.c = price;
      return forecastOutcome(copy, setup);
    };
    expect(at(104)).toBe('up');
    expect(at(96)).toBe('down');
    expect(at(102)).toBe('range');
    expect(forecastOutcome(candles.slice(0, 155), setup)).toBeNull();
  });

  it('picks moments with history before and the horizon after', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const at = pickForecastMoment(400, rng);
      expect(at).not.toBeNull();
      expect(at).toBeGreaterThanOrEqual(FORECAST_HISTORY);
      expect(at).toBeLessThanOrEqual(399 - FORECAST_HORIZON);
    }
    expect(pickForecastMoment(FORECAST_HISTORY + 5, rng)).toBeNull();
  });

  it('scores confidence: sure and wrong costs the most', () => {
    expect(brier(0.8, true)).toBeCloseTo(0.04);
    expect(brier(0.8, false)).toBeCloseTo(0.64);
    expect(brier(0.4, false)).toBeCloseTo(0.16);
  });

  it('summarizes calibration and flags overconfidence', () => {
    const attempt = (pick: 'up' | 'down', confidence: 0.4 | 0.8): ForecastAttempt => ({
      dataset: 'BTCUSDT-240',
      time: 0,
      at: 0,
      pick,
      confidence,
      outcome: 'up',
    });
    const sureWrong = Array.from({ length: 10 }, (_, i) => attempt(i < 3 ? 'up' : 'down', 0.8));
    const s = summarizeForecasts([...sureWrong, attempt('up', 0.4)]);
    expect(s.count).toBe(11);
    expect(s.rows.find((r) => r.confidence === 0.8)).toMatchObject({ count: 10, hitRate: 0.3 });
    expect(s.overconfident).toBe(true);
    expect(s.brier).toBeGreaterThan(s.baseline ?? 0);
    expect(summarizeForecasts([])).toMatchObject({ count: 0, hitRate: null, brier: null });
  });
});

describe('situations', () => {
  it.each(SITUATIONS)(
    '$id has no dead ends, unreachable steps or steps without a good choice',
    (s) => {
      expect(situationProblems(s)).toEqual([]);
    },
  );

  it('scores discipline: by the plan 1, debatable 0.5, a broken rule 0', () => {
    expect(disciplineScore([])).toBeNull();
    expect(disciplineScore(['good', 'risky', 'bad', 'good'])).toBeCloseTo(0.625);
  });

  it('finds broken content', () => {
    expect(
      situationProblems({
        id: 'x',
        title: 't',
        skill: 's',
        steps: [
          {
            id: 'a',
            text: 'start',
            choices: [{ id: '1', text: 'go', verdict: 'bad', feedback: 'short', next: 'zz' }],
          },
          { id: 'b', text: 'lost', choices: [] },
        ],
      }),
    ).toEqual([
      'a: needs ≥2 choices',
      'a: no good choice',
      'a/1: feedback too short',
      'a/1: unknown next zz',
      'b: unreachable',
    ]);
  });
});
