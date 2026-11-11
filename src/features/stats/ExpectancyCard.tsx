import { Card } from '@/components/ui/Card';
import { formatR, plural } from '@/lib/format';
import { bootstrapMean, CI_LEVEL } from '@/lib/stats/confidence';

/** Expectancy in R with its bootstrap interval: how much the average can be trusted. */
export function ExpectancyCard({ rs }: { rs: readonly number[] }) {
  const ci = bootstrapMean(rs);
  if (!ci) return null;
  return (
    <Card className="flex flex-col gap-1" aria-label="Матожидание">
      <h2 className="font-semibold">Матожидание на сделку</h2>
      <p className="font-mono text-2xl font-semibold tabular-nums">{formatR(ci.mean)}</p>
      <p className="text-sm text-text-muted">
        Скорее всего (интервал {Math.round(CI_LEVEL * 100)} %) настоящее значение лежит от{' '}
        {formatR(ci.low)} до {formatR(ci.high)} (по {ci.n}{' '}
        {plural(ci.n, ['сделке', 'сделкам', 'сделкам'])}). Чем больше сделок, тем уже этот интервал.
      </p>
    </Card>
  );
}
