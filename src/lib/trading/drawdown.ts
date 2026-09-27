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

/** Longest run of consecutive items equal to `value`. */
export function longestRun(items: readonly boolean[], value: boolean): number {
  let best = 0;
  let run = 0;
  for (const item of items) {
    run = item === value ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
