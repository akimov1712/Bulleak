/** Market data, simulator and journal records (IndexedDB). See data-model.md. */

export type Side = 'long' | 'short';

/** One candle; t is the open time in ms UTC. */
export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type SimOutcome = 'tp' | 'sl' | 'timeout' | 'manual';

export interface SimTrade {
  id?: number;
  at: number;
  scenarioId: string | null;
  /** Set for backtest runs of a strategy (e.g. "tps"). */
  strategyTag?: string;
  dataset: string;
  startIndex: number;
  side: Side;
  entry: number;
  sl: number;
  tp: number;
  riskPct: number;
  balanceBefore: number;
  qty: number;
  exitPrice: number;
  exitIndex: number;
  outcome: SimOutcome;
  pnl: number;
  r: number;
  fees: number;
  notes?: string;
}

export type JournalAccount = 'demo' | 'testnet' | 'real';
export type JournalEmotion = 'calm' | 'fear' | 'greed' | 'fomo' | 'revenge' | 'bored';
export type JournalTimeframe = '1H' | '4H' | '1D' | 'other';

export interface JournalTrade {
  id?: number;
  openedAt: number;
  closedAt?: number;
  account: JournalAccount;
  symbol: string;
  side: Side;
  market: 'spot' | 'perp';
  entry: number;
  exit?: number;
  sl: number;
  tp?: number;
  qty: number;
  leverage: number;
  fees: number;
  /** Derived on close. */
  pnl?: number;
  r?: number;
  setup: string;
  timeframe: JournalTimeframe;
  followedPlan: boolean;
  emotion: JournalEmotion;
  notes: string;
  tags: string[];
}

export type SimDecision = Side | 'skip';

/** A lesson-linked simulator task on a fixed moment of history (content/scenarios.ts). */
export interface SimScenario {
  id: string;
  title: string;
  lessonId: `m${string}-l${string}`;
  /** Dataset name, e.g. "BTCUSDT-240". */
  dataset: string;
  /** Decision candle: the learner sees history up to and including it. */
  startIndex: number;
  /** What to look for, shown before the decision. */
  task: string;
  /** "Textbook" reading, shown after the decision. */
  debrief: string;
  expected: SimDecision;
  /** Textbook levels for a trade scenario. */
  ideal?: { sl: number; tp: number };
  /** How the textbook trade actually ended (default 'tp'): a rule-following trade can lose. */
  idealOutcome?: 'tp' | 'sl';
}
