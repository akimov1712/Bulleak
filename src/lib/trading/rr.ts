/** Risk / reward, R multiples and expectancy (calculators `rr`, `expectancy`, the simulator). */

import type { Side } from './pnl';

export interface RiskReward {
  /** Price distance entry → stop. */
  risk: number;
  /** Price distance entry → take profit. */
  reward: number;
  /** reward / risk: 3 means 1:3. */
  rr: number;
}

/**
 * R:R of a planned trade. Null when the levels are on the wrong side
 * (long: stop < entry < take; short: take < entry < stop) or invalid.
 */
export function riskReward(
  side: Side,
  entry: number,
  stop: number,
  take: number,
): RiskReward | null {
  if (![entry, stop, take].every((v) => Number.isFinite(v) && v > 0)) return null;
  const risk = side === 'long' ? entry - stop : stop - entry;
  const reward = side === 'long' ? take - entry : entry - take;
  if (risk <= 0 || reward <= 0) return null;
  return { risk, reward, rr: reward / risk };
}

/** Win rate (0–1) needed to break even at this R:R: `1 / (1 + RR)`. */
export function breakevenWinrate(rr: number): number | null {
  if (!Number.isFinite(rr) || rr <= 0) return null;
  return 1 / (1 + rr);
}

/** Result in R: profit or loss divided by the planned risk ($150 at $50 risk → 3R). */
export function rMultiple(result: number, riskUsd: number): number | null {
  if (!Number.isFinite(result) || !Number.isFinite(riskUsd) || riskUsd <= 0) return null;
  return result / riskUsd;
}

/**
 * Expectancy per trade in R: `E = w × avgWin − (1 − w) × avgLoss`
 * (w — win rate 0–1, wins and losses as positive R). Null for invalid input.
 */
export function expectancy(winrate: number, avgWinR: number, avgLossR: number): number | null {
  if (!Number.isFinite(winrate) || winrate < 0 || winrate > 1) return null;
  if (!Number.isFinite(avgWinR) || avgWinR < 0 || !Number.isFinite(avgLossR) || avgLossR < 0) {
    return null;
  }
  return winrate * avgWinR - (1 - winrate) * avgLossR;
}

export interface ExpectancyProjection {
  perTradeR: number;
  monthR: number;
  /** Rough monthly result in % of the balance (monthR × risk %, without compounding). */
  monthPct: number;
}

/** What an expectancy means for a month of trading (calculator `expectancy`). */
export function expectancyProjection(
  winrate: number,
  avgWinR: number,
  avgLossR: number,
  tradesPerMonth: number,
  riskPct: number,
): ExpectancyProjection | null {
  const perTradeR = expectancy(winrate, avgWinR, avgLossR);
  if (perTradeR === null) return null;
  if (!Number.isInteger(tradesPerMonth) || tradesPerMonth < 0) return null;
  if (!Number.isFinite(riskPct) || riskPct <= 0 || riskPct > 100) return null;
  const monthR = perTradeR * tradesPerMonth;
  return { perTradeR, monthR, monthPct: monthR * riskPct };
}
