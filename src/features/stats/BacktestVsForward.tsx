import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/Card';
import { journalRepo } from '@/db/journalRepo';
import { simRepo } from '@/db/simRepo';
import { formatNumber, formatPct, formatR } from '@/lib/format';
import { forwardComparison, type ResultMetrics } from '@/lib/journal/forward';
import { tradeKind } from '@/lib/trading/simStats';

const ROWS: [string, (m: ResultMetrics) => string][] = [
  ['Сделок', (m) => String(m.count)],
  ['Винрейт', (m) => formatPct(m.winrate, 0)],
  ['Матожидание', (m) => formatR(m.expectancyR)],
  ['Профит-фактор', (m) => formatNumber(m.profitFactor, 2)],
  ['Макс. просадка', (m) => (m.maxDrawdownR > 0 ? `−${formatNumber(m.maxDrawdownR, 1)}R` : '0R')],
  ['Макс. серия убытков', (m) => String(m.longestLossStreak)],
];

/**
 * Stats, journal tab (m11-l06): backtest (simulator backtest trades) next to the forward test
 * (closed demo/testnet journal trades). Hidden until both sides have at least one trade.
 */
export function BacktestVsForward() {
  const loaded = useLiveQuery(
    () =>
      Promise.all([simRepo.list(), journalRepo.list()])
        .then(([sim, journal]) =>
          forwardComparison(
            sim.filter((t) => tradeKind(t) === 'backtest'),
            journal,
          ),
        )
        .catch(() => null),
    [],
  );
  if (!loaded || loaded.backtest.count === 0 || loaded.forward.count === 0) return null;
  const { backtest, forward } = loaded;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-extrabold">Бэктест vs форвард</h2>
      <table className="w-full text-left tabular-nums">
        <thead>
          <tr className="text-sm text-text-muted">
            <th scope="col" className="py-1 font-bold">
              Метрика
            </th>
            <th scope="col" className="py-1 font-bold">
              Бэктест
            </th>
            <th scope="col" className="py-1 font-bold">
              Форвард
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, value]) => (
            <tr key={label} className="border-t border-border">
              <th scope="row" className="py-1 font-bold">
                {label}
              </th>
              <td className="py-1">{value(backtest)}</td>
              <td className="py-1">{value(forward)}</td>
            </tr>
          ))}
          <tr className="border-t border-border">
            <th scope="row" className="py-1 font-bold">
              По плану
            </th>
            <td className="py-1">—</td>
            <td className="py-1">{formatPct(forward.followedPlanShare, 0)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-text-muted">
        Форвард — закрытые сделки журнала на демо и тестнете. Если он заметно хуже бэктеста, ищи
        причину в исполнении: доля сделок по плану и разбивка по эмоциям ниже.
      </p>
    </Card>
  );
}
