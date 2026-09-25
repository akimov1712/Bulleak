/**
 * Display formatting. Values in logic stay raw numbers; rounding happens only here.
 * Percentages are passed as fractions (0.01 = 1%).
 */

const LOCALE = 'ru-RU';
const DASH = '—';
const MINUS = '−';

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// Intl.NumberFormat construction is expensive; tables format hundreds of cells per render.
const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(minDecimals: number, maxDecimals: number): Intl.NumberFormat {
  const key = `${minDecimals}:${maxDecimals}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Sign for display, decided AFTER rounding to `decimals` so that e.g. −0.0001 shown with
 * 2 decimals is "0", not "−0".
 */
function displaySign(value: number, decimals: number, plusForPositive: boolean): string {
  const rounded = Number(Math.abs(value).toFixed(decimals));
  if (rounded === 0) return '';
  if (value < 0) return MINUS;
  return plusForPositive ? '+' : '';
}

/** Decimals needed to show values on the given step (0.1 → 1, 2.5 → 1, 1.5e-7 → 8). */
export function decimalsForStep(step: number): number {
  if (!isFiniteNumber(step) || step <= 0) return 0;
  const [mantissa = '', exponent] = step.toString().toLowerCase().split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - (exponent ? Number(exponent) : 0));
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
  opts: { minDecimals?: number } = {},
): string {
  if (!isFiniteNumber(value)) return DASH;
  return numberFormat(opts.minDecimals ?? 0, decimals).format(value);
}

/** $1 234,56 style with the minus sign as a proper "−". */
export function formatUsd(value: number | null | undefined, decimals = 2): string {
  if (!isFiniteNumber(value)) return DASH;
  const abs = numberFormat(decimals, decimals).format(Math.abs(value));
  return `${displaySign(value, decimals, false)}$${abs}`;
}

/** 0.0123 → "1,23%". `signed` adds "+" for positive values. */
export function formatPct(
  fraction: number | null | undefined,
  decimals = 2,
  signed = false,
): string {
  if (!isFiniteNumber(fraction)) return DASH;
  const pct = fraction * 100;
  return `${displaySign(pct, decimals, signed)}${formatNumber(Math.abs(pct), decimals)}%`;
}

/** Price with fixed decimals derived from the instrument tick size. */
export function formatPrice(value: number | null | undefined, step = 0.01): string {
  if (!isFiniteNumber(value)) return DASH;
  const decimals = decimalsForStep(step);
  return numberFormat(decimals, decimals).format(value);
}

/** R-multiple: 1.5 → "+1,5R", -1 → "−1R". */
export function formatR(value: number | null | undefined, decimals = 2): string {
  if (!isFiniteNumber(value)) return DASH;
  return `${displaySign(value, decimals, true)}${formatNumber(Math.abs(value), decimals)}R`;
}

/** Seconds → "1 ч 5 мин", "12 мин", "45 с". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!isFiniteNumber(totalSeconds) || totalSeconds < 0) return DASH;
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  if (minutes > 0) return `${minutes} мин`;
  return `${seconds} с`;
}

/** Russian plural: plural(5, ['урок', 'урока', 'уроков']) → "уроков". */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
