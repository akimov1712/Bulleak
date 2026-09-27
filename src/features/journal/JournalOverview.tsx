import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { formatNumber, formatPct, formatR, formatUsd } from '@/lib/format';
import { groupStats, type JournalMetrics } from '@/lib/journal/metrics';
import type { JournalTrade } from '@/types/trading';
import { EquityCurves } from '../calculators/EquityCurves';
import { EMOTION_LABEL } from './labels';

/** KPI tiles and the equity curve of the filtered trades. */
export function JournalKpis({ metrics }: { metrics: JournalMetrics }) {
  const [unit, setUnit] = useState<'r' | 'usd'>('r');
  const tiles: [string, string][] = [
    ['Сделок', String(metrics.count)],
    ['Винрейт', formatPct(metrics.winrate, 0)],
    ['Профит-фактор', formatNumber(metrics.profitFactor, 2)],
    ['Средний R', formatR(metrics.avgR)],
    ['Итог', `${formatR(metrics.totalR)} · ${formatUsd(metrics.totalPnl)}`],
    [
      'Макс. просадка',
      metrics.maxDrawdownR > 0 ? `−${formatNumber(metrics.maxDrawdownR, 2)}R` : '0R',
    ],
  ];
  const curve = [0, ...metrics.equity.map((p) => (unit === 'r' ? p.r : p.pnl))];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value]) => (
          <Card key={label} padding="sm" className="flex flex-col">
            <dt className="text-sm font-bold text-text-muted">{label}</dt>
            <dd className="text-lg font-extrabold break-words tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>
      {metrics.equity.length > 1 && (
        <Card className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-extrabold">Кривая капитала</h2>
            <Segmented
              label="Единицы кривой"
              hideLabel
              value={unit}
              options={[
                { value: 'r', label: 'в R' },
                { value: 'usd', label: 'в $' },
              ]}
              onChange={setUnit}
            />
          </div>
          <EquityCurves
            curves={[curve]}
            baseline={0}
            label={`Кривая капитала по ${metrics.count} закрытым сделкам`}
          />
        </Card>
      )}
      {metrics.count > 0 && metrics.followedPlanShare !== null && (
        <p className="text-sm text-text-muted">
          По плану — {formatPct(metrics.followedPlanShare, 0)} сделок. Самая длинная серия: плюс{' '}
          {metrics.longestWinStreak}, минус {metrics.longestLossStreak}.
        </p>
      )}
    </div>
  );
}

/** Setup and emotion breakdowns — the psychology insight of the journal. */
export function JournalBreakdowns({ trades }: { trades: readonly JournalTrade[] }) {
  const bySetup = groupStats(trades, 'setup');
  const byEmotion = groupStats(trades, 'emotion');
  if (bySetup.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Breakdown title="По сетапам" rows={bySetup.map((g) => ({ ...g, label: g.key || '—' }))} />
      <Breakdown
        title="По эмоциям"
        rows={byEmotion.map((g) => ({ ...g, label: EMOTION_LABEL[g.key] }))}
      />
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; winrate: number; avgR: number }[];
}) {
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-extrabold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="font-bold">Группа</th>
            <th className="text-right font-bold">Сделок</th>
            <th className="text-right font-bold">Винрейт</th>
            <th className="text-right font-bold">Средний R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <td className="py-1 font-bold">{r.label}</td>
              <td className="text-right tabular-nums">{r.count}</td>
              <td className="text-right tabular-nums">{formatPct(r.winrate, 0)}</td>
              <td className="text-right tabular-nums">{formatR(r.avgR)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
