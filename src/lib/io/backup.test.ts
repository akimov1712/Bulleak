import { describe, expect, it } from 'vitest';
import { createInitialProgress, emptyLessonProgress } from '@/lib/progress/initial';
import type { Settings } from '@/types/settings';
import type { JournalTrade, SimTrade } from '@/types/trading';
import { backupFileName, buildExport, parseImport } from './backup';

const NOW = Date.UTC(2026, 8, 27, 12);
const settings: Settings = {
  theme: 'dark',
  sound: true,
  dailyGoalXp: 50,
  freeMode: false,
  reducedMotion: 'system',
};
const sim: SimTrade = {
  id: 3,
  at: NOW,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 500,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 10_000,
  qty: 20,
  exitPrice: 110,
  exitIndex: 505,
  outcome: 'tp',
  pnl: 197.7,
  r: 1.98,
  fees: 2.3,
};
const journal: JournalTrade = {
  id: 1,
  openedAt: NOW,
  account: 'testnet',
  symbol: 'BTCUSDT',
  side: 'short',
  market: 'perp',
  entry: 60_000,
  sl: 61_000,
  qty: 0.01,
  leverage: 3,
  fees: 0.5,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: ['a'],
};

function progress() {
  const p = createInitialProgress(NOW);
  p.xp = 345;
  p.lessons['m00-l01'] = {
    ...emptyLessonProgress(),
    completedAt: NOW,
    quizBest: 1,
    quizAttempts: 1,
  };
  return p;
}

describe('backup', () => {
  it('export → JSON → import returns the same data', () => {
    const file = buildExport({
      progress: progress(),
      settings,
      simTrades: [sim],
      journal: [journal],
      simBalance: 10_197.7,
      now: NOW,
    });
    const result = parseImport(JSON.stringify(file), NOW + 1000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.progress).toEqual(JSON.parse(JSON.stringify(progress())));
    expect(result.data.settings).toEqual(settings);
    expect(result.data.simTrades).toEqual([sim]);
    expect(result.data.journal).toEqual([journal]);
    expect(result.data.simBalance).toBe(10_197.7);
    expect(result.data.preview).toEqual({
      lessonsCompleted: 1,
      xp: 345,
      simTrades: 1,
      journal: 1,
      exportedAt: NOW,
      skipped: 0,
    });
    expect(backupFileName(NOW)).toMatch(/^trading-course-backup-2026-09-2\d\.json$/);
  });

  it('rejects broken or foreign files with a readable error', () => {
    const cases: [string, RegExp][] = [
      ['{not json', /не JSON/],
      ['[]', /не резервная копия/],
      [JSON.stringify({ app: 'other', progress: {} }), /не резервная копия/],
      [JSON.stringify({ app: 'trading-course', schema: 99, progress: {} }), /более новой версией/],
      [JSON.stringify({ app: 'trading-course', schema: 1 }), /нет данных прогресса/],
    ];
    for (const [text, error] of cases) {
      const r = parseImport(text, NOW);
      expect(r.ok, text).toBe(false);
      if (!r.ok) expect(r.error).toMatch(error);
    }
  });

  it('skips damaged trade records and migrates old progress', () => {
    const r = parseImport(
      JSON.stringify({
        app: 'trading-course',
        schema: 1,
        progressVersion: 1,
        progress: { xp: 10, counters: { simCorrectSkips: 3 } },
        settings: { theme: 'neon', sound: false },
        simTrades: [sim, { ...sim, side: 'up' }, 'junk'],
        journal: [{ ...journal, tags: 'a' }],
      }),
      NOW,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.preview.skipped).toBe(3);
    expect(r.data.simTrades).toHaveLength(1);
    expect(r.data.progress.xp).toBe(10);
    expect(r.data.progress.counters.simSkippedScenarios).toEqual([]);
    expect(r.data.settings).toEqual({ sound: false });
  });
});
