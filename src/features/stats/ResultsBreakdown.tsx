import { Card } from '@/components/ui/Card';
import { formatR } from '@/lib/format';
import { breakdown, curveStats, type Result } from '@/lib/stats/breakdown';
import { EquityCurves } from '../calculators/EquityCurves';
import { Breakdown } from '../journal/JournalOverview';

export interface LabelledResult extends Result {
  symbol: string;
  timeframe: string;
  side: 'long' | 'short';
}

const SIDE_LABEL = { long: 'Лонг', short: 'Шорт' } as const;

/** R curve with drawdown and streaks (time order). */
export function CurveCard({ results }: { results: readonly Result[] }) {
  if (results.length < 2) return null;
  const s = curveStats(results);
  return (
    <Card className="flex flex-col gap-2" aria-label="Результат в R">
      <h2 className="font-semibold">Результат в R по сделкам</h2>
      <EquityCurves curves={[s.curveR]} baseline={0} label="Накопленный результат в R" />
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-text-muted">Макс. просадка</dt>
          <dd className="font-mono font-semibold tabular-nums">{formatR(-s.maxDrawdownR)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Побед подряд</dt>
          <dd className="font-mono font-semibold tabular-nums">{s.longestWinStreak}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Убытков подряд</dt>
          <dd className="font-mono font-semibold tabular-nums">{s.longestLossStreak}</dd>
        </div>
      </dl>
    </Card>
  );
}

/** By instrument, timeframe and side, each with its number of trades. */
export function GroupBreakdowns({ results }: { results: readonly LabelledResult[] }) {
  if (results.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Breakdown title="По инструменту" rows={breakdown(results, (t) => t.symbol)} />
      <Breakdown title="По таймфрейму" rows={breakdown(results, (t) => t.timeframe)} />
      <Breakdown title="По стороне" rows={breakdown(results, (t) => SIDE_LABEL[t.side])} />
    </div>
  );
}
