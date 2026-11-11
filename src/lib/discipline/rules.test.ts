import { describe, expect, it } from 'vitest';
import type { ClosedTrade } from '@/lib/journal/metrics';
import type { SimTrade } from '@/types/trading';
import { disciplineChecks, fromJournal, fromSim } from './rules';

const MIN = 60_000;
const T0 = new Date(2026, 10, 11, 12, 0).getTime();

const journal = (patch: Partial<ClosedTrade>): ClosedTrade => ({
  openedAt: T0,
  closedAt: T0 + 60 * MIN,
  account: 'demo',
  symbol: 'BTCUSDT',
  side: 'long',
  market: 'perp',
  entry: 100,
  exit: 110,
  sl: 95,
  tp: 110,
  qty: 1,
  leverage: 2,
  fees: 0,
  pnl: 10,
  r: 2,
  setup: 'tps',
  timeframe: '4H',
  followedPlan: true,
  emotion: 'calm',
  notes: '',
  tags: [],
  ...patch,
});
const lossJ = (patch: Partial<ClosedTrade>) => journal({ exit: 95, pnl: -5, r: -1, ...patch });

const sim = (patch: Partial<SimTrade>): SimTrade => ({
  at: T0,
  scenarioId: null,
  dataset: 'BTCUSDT-240',
  startIndex: 0,
  side: 'long',
  entry: 100,
  sl: 95,
  tp: 110,
  riskPct: 1,
  balanceBefore: 1000,
  qty: 2,
  exitPrice: 110,
  exitIndex: 5,
  outcome: 'tp',
  pnl: 20,
  r: 2,
  fees: 0,
  ...patch,
});

const rules = (checks: { rule: string; ok: boolean }[]) =>
  checks.map((c) => `${c.rule}:${c.ok ? 'ok' : 'broken'}`);

describe('journal trades', () => {
  it('check R:R and the plan; risk needs a balance, so it does not apply', () => {
    const [c] = disciplineChecks([fromJournal(journal({}))]);
    expect(rules(c ?? [])).toEqual(['rr:ok', 'plan:ok']);
    const [noTp] = disciplineChecks([fromJournal(journal({ tp: undefined, followedPlan: false }))]);
    expect(rules(noTp ?? [])).toEqual(['plan:broken']);
  });

  it('a trade marked «revenge» breaks the rule by itself', () => {
    const [c] = disciplineChecks([fromJournal(journal({ emotion: 'revenge' }))]);
    expect(rules(c ?? [])).toContain('revenge:broken');
  });

  it('revenge after a loss compares the money at risk; the window counts from the close', () => {
    const first = lossJ({ openedAt: T0, closedAt: T0 + 10 * MIN });
    const bigger = journal({ openedAt: T0 + 20 * MIN, qty: 3 });
    const late = journal({ openedAt: T0 + 30 * MIN, qty: 3 });
    expect(rules(disciplineChecks([first, bigger].map(fromJournal))[1] ?? [])).toContain(
      'revenge:broken',
    );
    expect(rules(disciplineChecks([first, late].map(fromJournal))[1] ?? [])).not.toContain(
      'revenge:broken',
    );
  });

  it('the daily loss limit counts in R without a balance', () => {
    const day = [0, 1, 2, 3].map((i) =>
      lossJ({ openedAt: T0 + i * 60 * MIN, closedAt: T0 + i * 60 * MIN + 30 * MIN }),
    );
    const checks = disciplineChecks(day.map(fromJournal)).map((c) =>
      c.find((x) => x.rule === 'daily-loss'),
    );
    expect(checks).toEqual([
      undefined,
      { rule: 'daily-loss', ok: true },
      { rule: 'daily-loss', ok: true },
      { rule: 'daily-loss', ok: false },
    ]);
  });
});

describe('simulator trades', () => {
  it('check risk, R:R and, once recorded, a stop moved away', () => {
    const [c] = disciplineChecks([fromSim({ ...sim({ riskPct: 2 }), stopMovedAway: true })]);
    expect(rules(c ?? [])).toEqual(['risk:broken', 'rr:ok', 'stop-moved:broken']);
    const [plain] = disciplineChecks([fromSim(sim({}))]);
    expect(rules(plain ?? [])).toEqual(['risk:ok', 'rr:ok']);
  });
});
