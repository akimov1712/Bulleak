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
