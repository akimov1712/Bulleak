/** Drawdowns and losing streaks (calculator `drawdown`, lessons m09-l01 and m09-l04). */

const isPct = (v: number) => Number.isFinite(v) && v >= 0 && v < 100;

/** Growth needed to get back to the peak after a drawdown: 1 / (1 − d) − 1, in %. */
export function recoveryPct(drawdownPct: number): number | null {
  if (!isPct(drawdownPct)) return null;
  const d = drawdownPct / 100;
  return (1 / (1 - d) - 1) * 100;
}

/**
 * Drawdown after `losses` losing trades in a row, each risking `riskPct` of the current
 * balance (compounding): 1 − (1 − r)^n, in %.
 */
export function drawdownAfterLosses(losses: number, riskPct: number): number | null {
  if (!Number.isInteger(losses) || losses < 0 || !isPct(riskPct)) return null;
  return (1 - (1 - riskPct / 100) ** losses) * 100;
}

/** Chance that a given run of `n` trades are all losers: lossProbability^n (0–1). */
export function streakProbability(lossProbability: number, n: number): number | null {
  if (!Number.isFinite(lossProbability) || lossProbability < 0 || lossProbability > 1) return null;
  if (!Number.isInteger(n) || n < 0) return null;
  return lossProbability ** n;
}

/** Largest peak-to-trough fall of an equity curve, in % of the peak. */
export function maxDrawdownPct(curve: readonly number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    if (peak > 0) worst = Math.max(worst, (1 - v / peak) * 100);
  }
  return worst;
}

/** Longest run of consecutive losing trades. */
export function maxLosingStreak(wins: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const win of wins) {
    run = win ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}
