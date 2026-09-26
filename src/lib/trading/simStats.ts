/** Simulator history: trade kinds, filters and a small summary (T-508). */
import type { SimTrade } from '@/types/trading';

export type SimTradeKind = 'free' | 'scenario' | 'backtest';

export const tradeKind = (t: Pick<SimTrade, 'scenarioId' | 'strategyTag'>): SimTradeKind =>
  t.strategyTag !== undefined ? 'backtest' : t.scenarioId !== null ? 'scenario' : 'free';

export type SimTradeFilterKind = SimTradeKind | 'all';

export const filterTrades = <T extends Pick<SimTrade, 'scenarioId' | 'strategyTag'>>(
  trades: readonly T[],
  kind: SimTradeFilterKind,
): T[] => (kind === 'all' ? [...trades] : trades.filter((t) => tradeKind(t) === kind));

export interface SimSummary {
  count: number;
  wins: number;
  /** 0–1, null without trades. */
  winrate: number | null;
  avgR: number | null;
  totalR: number;
  totalPnl: number;
}

/** A trade counts as a win when its result after fees is positive. */
export function simSummary(trades: readonly Pick<SimTrade, 'r' | 'pnl'>[]): SimSummary {
  const count = trades.length;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const totalR = trades.reduce((sum, t) => sum + t.r, 0);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  return {
    count,
    wins,
    winrate: count > 0 ? wins / count : null,
    avgR: count > 0 ? totalR / count : null,
    totalR,
    totalPnl,
  };
}
