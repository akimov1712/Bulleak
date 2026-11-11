/** CSV export of trades (docs/04-features/stats-v2.md, section 9). Separator «;» and a BOM: Excel in Russian locale opens it as columns. */
import type { JournalTrade, SimTrade } from '@/types/trading';

const BOM = String.fromCharCode(0xfeff);

/** One field: quoted when it holds a separator, a quote or a line break. */
export function csvField(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(';'));
  return BOM + lines.join('\r\n') + '\r\n';
}

const iso = (ms: number | undefined) => (ms === undefined ? '' : new Date(ms).toISOString());

export function simTradesCsv(trades: readonly SimTrade[]): string {
  return toCsv(
    [
      'time',
      'dataset',
      'scenario',
      'strategy',
      'side',
      'entry',
      'sl',
      'tp',
      'risk_pct',
      'qty',
      'exit',
      'outcome',
      'pnl',
      'r',
      'fees',
      'actions',
    ],
    trades
      .filter((t) => !t.deleted)
      .map((t) => [
        iso(t.at),
        t.dataset,
        t.scenarioId ?? '',
        t.strategyTag ?? '',
        t.side,
        t.entry,
        t.sl,
        t.tp,
        t.riskPct,
        t.qty,
        t.exitPrice,
        t.outcome,
        t.pnl,
        t.r,
        t.fees,
        (t.actions ?? []).map((a) => `${a.kind}@${a.price}`).join(' '),
      ]),
  );
}

export function journalCsv(trades: readonly JournalTrade[]): string {
  return toCsv(
    [
      'opened',
      'closed',
      'account',
      'symbol',
      'market',
      'side',
      'entry',
      'exit',
      'sl',
      'tp',
      'qty',
      'leverage',
      'fees',
      'pnl',
      'r',
      'setup',
      'timeframe',
      'followed_plan',
      'emotion',
      'notes',
    ],
    trades
      .filter((t) => !t.deleted)
      .map((t) => [
        iso(t.openedAt),
        iso(t.closedAt),
        t.account,
        t.symbol,
        t.market,
        t.side,
        t.entry,
        t.exit,
        t.sl,
        t.tp,
        t.qty,
        t.leverage,
        t.fees,
        t.pnl,
        t.r,
        t.setup,
        t.timeframe,
        t.followedPlan ? 'yes' : 'no',
        t.emotion,
        t.notes,
      ]),
  );
}
