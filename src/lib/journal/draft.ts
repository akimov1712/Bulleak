/**
 * Journal form draft ↔ JournalTrade (T-606). The form keeps raw values (numbers may be empty,
 * dates are datetime-local strings); `draftToTrade` validates them and derives P&L and R.
 */
import type {
  JournalAccount,
  JournalEmotion,
  JournalTimeframe,
  JournalTrade,
  Side,
} from '@/types/trading';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/date';
import { journalResult, validateJournalTrade, type JournalError } from './pnl';

export interface JournalDraft {
  account: JournalAccount;
  symbol: string;
  side: Side;
  market: 'spot' | 'perp';
  entry: number | null;
  sl: number | null;
  tp: number | null;
  qty: number | null;
  leverage: number | null;
  fees: number | null;
  exit: number | null;
  openedAt: string;
  closedAt: string;
  setup: string;
  timeframe: JournalTimeframe;
  followedPlan: boolean;
  emotion: JournalEmotion;
  notes: string;
  /** Comma-separated. */
  tags: string;
}

export type DraftField = keyof JournalDraft;

export function emptyDraft(now: number): JournalDraft {
  return {
    account: 'demo',
    symbol: 'BTCUSDT',
    side: 'long',
    market: 'perp',
    entry: null,
    sl: null,
    tp: null,
    qty: null,
    leverage: 1,
    fees: 0,
    exit: null,
    openedAt: toDateTimeLocal(now),
    closedAt: '',
    setup: '',
    timeframe: '4H',
    followedPlan: true,
    emotion: 'calm',
    notes: '',
    tags: '',
  };
}

export function tradeToDraft(t: JournalTrade): JournalDraft {
  return {
    account: t.account,
    symbol: t.symbol,
    side: t.side,
    market: t.market,
    entry: t.entry,
    sl: t.sl,
    tp: t.tp ?? null,
    qty: t.qty,
    leverage: t.leverage,
    fees: t.fees,
    exit: t.exit ?? null,
    openedAt: toDateTimeLocal(t.openedAt),
    closedAt: t.closedAt === undefined ? '' : toDateTimeLocal(t.closedAt),
    setup: t.setup,
    timeframe: t.timeframe,
    followedPlan: t.followedPlan,
    emotion: t.emotion,
    notes: t.notes,
    tags: t.tags.join(', '),
  };
}

const MESSAGES: Record<JournalError, [DraftField, string]> = {
  entry: ['entry', 'Укажи цену входа больше 0.'],
  'sl-side': ['sl', 'Стоп должен быть по другую сторону от входа: у лонга ниже, у шорта выше.'],
  'tp-side': ['tp', 'Тейк должен быть по сторону прибыли: у лонга выше входа, у шорта ниже.'],
  qty: ['qty', 'Объём должен быть больше 0.'],
  leverage: ['leverage', 'Плечо — от 1×.'],
  fees: ['fees', 'Комиссии не могут быть отрицательными.'],
  exit: ['exit', 'Цена выхода должна быть больше 0.'],
  'closed-before-open': ['closedAt', 'Сделка не может закрыться раньше, чем открылась.'],
};

export type DraftErrors = Partial<Record<DraftField, string>>;

export type DraftResult =
  { ok: true; trade: Omit<JournalTrade, 'id'> } | { ok: false; errors: DraftErrors };

export function draftToTrade(d: JournalDraft): DraftResult {
  const errors: DraftErrors = {};
  const openedAt = fromDateTimeLocal(d.openedAt);
  if (openedAt === null) errors.openedAt = 'Укажи дату и время входа.';
  const closedAt = d.closedAt === '' ? undefined : fromDateTimeLocal(d.closedAt);
  if (closedAt === null) errors.closedAt = 'Неверная дата выхода.';
  if (d.entry === null) errors.entry = 'Укажи цену входа.';
  if (d.sl === null) errors.sl = 'Стоп обязателен: без него нельзя посчитать риск и R.';
  if (d.qty === null) errors.qty = 'Укажи объём.';
  if (d.symbol.trim() === '') errors.symbol = 'Укажи инструмент.';
  if ((d.exit === null) !== (closedAt === undefined)) {
    errors[d.exit === null ? 'exit' : 'closedAt'] =
      'Для закрытой сделки нужны и цена, и дата выхода.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const base = {
    side: d.side,
    entry: d.entry ?? 0,
    sl: d.sl ?? 0,
    tp: d.tp ?? undefined,
    qty: d.qty ?? 0,
    leverage: d.leverage ?? 0,
    fees: d.fees ?? 0,
    exit: d.exit ?? undefined,
    openedAt: openedAt ?? 0,
    closedAt: closedAt ?? undefined,
  };
  for (const e of validateJournalTrade(base)) {
    const [field, message] = MESSAGES[e];
    errors[field] ??= message;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const result = journalResult(base);
  return {
    ok: true,
    trade: {
      ...base,
      account: d.account,
      symbol: d.symbol.trim().toUpperCase(),
      market: d.market,
      pnl: result?.pnl,
      r: result?.r,
      setup: d.setup.trim(),
      timeframe: d.timeframe,
      followedPlan: d.followedPlan,
      emotion: d.emotion,
      notes: d.notes.trim(),
      tags: d.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    },
  };
}
