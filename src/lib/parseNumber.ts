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

/** Round to the nearest multiple of `step` (floating-point safe for display steps). */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0)) return value;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number((Math.round(value / step) * step).toFixed(decimals));
}
