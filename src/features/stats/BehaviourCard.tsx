import { Card } from '@/components/ui/Card';
import { formatNumber, formatPct, formatR } from '@/lib/format';
import { disposition, overtrading, type HeldTrade } from '@/lib/stats/behaviour';

/** Behavioural metrics: disposition effect, revenge trades and overtrading. */
export function BehaviourCard({
  trades,
  revenge,
}: {
  trades: readonly HeldTrade[];
  /** Revenge checks of the same trades: broken and checked. */
  revenge: { broken: number; checked: number };
}) {
  const d = disposition(trades);
  const o = overtrading(trades);
  return (
    <Card className="flex flex-col gap-3" aria-label="Поведение">
      <h2 className="font-semibold">Поведение</h2>
      <div>
        <h3 className="text-sm font-bold text-text-muted">Эффект диспозиции</h3>
        <p>
          {d.ratio === null
            ? 'Нужны и прибыльные, и убыточные сделки.'
            : d.ratio > 1.2
              ? `Убыточные сделки держатся в ${formatNumber(d.ratio, 1)} раза дольше прибыльных: похоже, убыткам дают «отрасти», а прибыль фиксируют рано.`
              : `Убыточные и прибыльные сделки держатся примерно одинаково (×${formatNumber(d.ratio, 1)}) — хороший знак.`}
        </p>
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-muted">Сделки из мести</h3>
        <p>
          {revenge.checked === 0
            ? 'Случаев проверить не было: правило применяется после убытка.'
            : `${revenge.broken} из ${revenge.checked} сделок после убытка — с бо́льшим риском или с отметкой «месть» (${formatPct(revenge.broken / revenge.checked, 0)}).`}
        </p>
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-muted">Овертрейдинг</h3>
        <p>
          {o === null
            ? 'Оценка появится после пяти торговых дней.'
            : o.busyDays === 0
              ? 'Дней с резким всплеском сделок нет.'
              : `Дней со всплеском сделок (больше ${o.threshold} в день): ${o.busyDays}. Средний результат в такие дни — ${formatR(o.busyAvgR)}, в остальные — ${formatR(o.otherAvgR)}.`}
        </p>
      </div>
    </Card>
  );
}
