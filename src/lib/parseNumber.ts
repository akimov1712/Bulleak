import { decimalsForStep } from './format';

/**
 * Parse user-typed numbers: accepts "," or "." as decimal separator, spaces/nbsp as
 * thousands separators, a leading "+" or "-"/"−". Returns null for empty or invalid input.
 */
export function parseNumber(input: string): number | null {
  const cleaned = input.trim().replace(/[\s']/g, '').replace(/^−/, '-').replace(',', '.');
  if (cleaned === '' || cleaned === '-' || cleaned === '+' || cleaned === '.') return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Keep `value` within [min, max]; null bounds are ignored. */
export function clamp(value: number, min?: number, max?: number): number {
  let v = value;
  if (min !== undefined && v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

/** Round to the nearest multiple of `step`, trimming float noise to the step's precision. */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0)) return value;
  return Number((Math.round(value / step) * step).toFixed(decimalsForStep(step)));
}

/** Plain decimal text without exponent or grouping: 1e-7 → "0.0000001". */
export function toPlainString(value: number): string {
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
}
