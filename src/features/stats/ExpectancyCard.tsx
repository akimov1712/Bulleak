import { Card } from '@/components/ui/Card';
import { formatR, plural } from '@/lib/format';
import {
  bootstrapMean,
  CI_LEVEL,
  edgeVerdict,
  MIN_TRADES_FOR_VERDICT,
  type EdgeVerdict,
} from '@/lib/stats/confidence';

/** «Достаточно ли сделок?» — never calls a strategy profitable without the data for it. */
const VERDICT_TEXT: Record<EdgeVerdict, string> = {
  'too-few': `Сделок меньше ${MIN_TRADES_FOR_VERDICT}: по ним нельзя сказать, есть ли у тебя преимущество. Это нормально — просто продолжай.`,
  unclear:
    'Интервал включает ноль: по этим данным нельзя отличить преимущество от везения. Нужно больше сделок.',
  positive:
    'Весь интервал выше нуля: на этих сделках результат положительный не случайно. Это история, а не обещание будущей прибыли — рынок меняется.',
  negative:
    'Весь интервал ниже нуля: в таком виде подход теряет деньги. Разбери сделки в журнале и проверь правила.',
};

/** Expectancy in R with its bootstrap interval and an honest verdict on the sample. */
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
      <p className="text-sm font-semibold" role="status">
        {VERDICT_TEXT[edgeVerdict(ci)]}
      </p>
    </Card>
  );
}
