/**
 * How sure can we be about a result (docs/04-features/stats-v2.md, section 5)? Bootstrap with a
 * fixed seed: the same trades always give the same interval.
 */
import { mulberry32 } from '@/lib/random';

export const CI_LEVEL = 0.9;
export const BOOTSTRAP_RUNS = 2000;
/** Fewer trades than this: no conclusion about an edge at all. */
export const MIN_TRADES_FOR_VERDICT = 30;

export interface MeanInterval {
  n: number;
  mean: number;
  low: number;
  high: number;
}

/** Percentile bootstrap interval of the mean; null for fewer than 2 values. */
export function bootstrapMean(
  xs: readonly number[],
  level = CI_LEVEL,
  runs = BOOTSTRAP_RUNS,
  seed = 1,
): MeanInterval | null {
  const n = xs.length;
  if (n < 2) return null;
  const rng = mulberry32(seed);
  const means = new Float64Array(runs);
  for (let r = 0; r < runs; r++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += xs[Math.floor(rng() * n)] ?? 0;
    means[r] = sum / n;
  }
  means.sort();
  const tail = (1 - level) / 2;
  const at = (q: number) => means[Math.min(runs - 1, Math.max(0, Math.floor(q * runs)))] ?? 0;
  return { n, mean: xs.reduce((s, x) => s + x, 0) / n, low: at(tail), high: at(1 - tail) };
}

/**
 * - too-few: under MIN_TRADES_FOR_VERDICT trades;
 * - unclear: the interval includes zero — the data can't tell an edge from luck;
 * - positive / negative: the whole interval is above / below zero.
 */
export type EdgeVerdict = 'too-few' | 'unclear' | 'positive' | 'negative';

export function edgeVerdict(ci: MeanInterval | null): EdgeVerdict {
  if (!ci || ci.n < MIN_TRADES_FOR_VERDICT) return 'too-few';
  if (ci.low > 0) return 'positive';
  if (ci.high < 0) return 'negative';
  return 'unclear';
}
