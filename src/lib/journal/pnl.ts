/** Journal trade result: P&L after fees and the result in R (journal.md, «Форма сделки»). */
import type { JournalTrade } from '@/types/trading';

export type JournalTradeLevels = Pick<
  JournalTrade,
  'side' | 'entry' | 'exit' | 'sl' | 'tp' | 'qty' | 'fees' | 'leverage' | 'openedAt' | 'closedAt'
>;

export interface JournalResult {
  /** After fees. */
  pnl: number;
  /** pnl / planned risk (qty × |entry − stop|). */
  r: number;
}

/** Result of a closed trade; null while it is open or the numbers are invalid. */
export function journalResult(
  t: Pick<JournalTrade, 'side' | 'entry' | 'exit' | 'sl' | 'qty' | 'fees'>,
): JournalResult | null {
  if (t.exit === undefined || !(t.exit > 0) || !(t.entry > 0) || !(t.qty > 0)) return null;
  const risk = Math.abs(t.entry - t.sl) * t.qty;
  if (!(risk > 0) || !Number.isFinite(t.fees) || t.fees < 0) return null;
  const gross = (t.side === 'long' ? t.exit - t.entry : t.entry - t.exit) * t.qty;
  const pnl = gross - t.fees;
  return { pnl, r: pnl / risk };
}

export type JournalError =
  'entry' | 'sl-side' | 'tp-side' | 'qty' | 'leverage' | 'fees' | 'exit' | 'closed-before-open';

/** Validation for the journal form: stop on the correct side, qty > 0, sane numbers. */
export function validateJournalTrade(t: JournalTradeLevels): JournalError[] {
  const errors: JournalError[] = [];
  const long = t.side === 'long';
  if (!(t.entry > 0)) errors.push('entry');
  if (!(t.sl > 0) || (t.entry > 0 && (long ? t.sl >= t.entry : t.sl <= t.entry))) {
    errors.push('sl-side');
  }
  if (t.tp !== undefined && t.entry > 0 && (long ? t.tp <= t.entry : t.tp >= t.entry)) {
    errors.push('tp-side');
  }
  if (!(t.qty > 0)) errors.push('qty');
  if (!(t.leverage >= 1)) errors.push('leverage');
  if (!Number.isFinite(t.fees) || t.fees < 0) errors.push('fees');
  if (t.exit !== undefined && !(t.exit > 0)) errors.push('exit');
  if (t.closedAt !== undefined && t.closedAt < t.openedAt) errors.push('closed-before-open');
  return errors;
}
