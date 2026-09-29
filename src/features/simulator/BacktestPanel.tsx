import { useState } from 'react';
import { useDbQuery } from '@/db/useDbQuery';
import { ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { simRepo } from '@/db/simRepo';
import type { StrategyRules } from '@/content/strategies';
import { formatNumber, formatPct, formatR } from '@/lib/format';
import { profitFactor, simSummary } from '@/lib/trading/simStats';
import type { SimTrade } from '@/types/trading';

export interface BacktestPanelProps {
  strategy: StrategyRules;
  /** Changes with every new decision point: the checklist starts empty again. */
  decisionKey: number;
}

/** Backtest side panel: rule checklist for the current setup, N/30 counter and a report. */
export function BacktestPanel({ strategy, decisionKey }: BacktestPanelProps) {
  const trades = useDbQuery<SimTrade[] | null>(
    () => simRepo.list({ strategyTag: strategy.tag }).catch(() => null),
    [strategy.tag],
  );
  const done = trades?.length ?? 0;
  const summary = simSummary(trades ?? []);
  const pf = profitFactor(trades ?? []);

  return (
    <Card className="flex flex-col gap-3" aria-label={`Бэктест: ${strategy.title}`}>
      <p className="flex items-center gap-2 font-extrabold">
        <ClipboardList className="size-5 text-epic" aria-hidden="true" />
        Бэктест {strategy.title}
      </p>
      <Checklist key={decisionKey} rules={strategy.rules} />
      <ProgressBar
        tone="epic"
        value={Math.min(1, done / strategy.targetTrades)}
        label="Сделок в бэктесте"
        valueText={`${done}/${strategy.targetTrades}`}
      />
      {trades === null ? (
        <p role="alert" className="text-sm text-bear">
          Не удалось загрузить сделки бэктеста.
        </p>
      ) : done > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-muted">Винрейт</dt>
          <dd className="text-right font-bold tabular-nums">{formatPct(summary.winrate, 0)}</dd>
          <dt className="text-text-muted">Средний R</dt>
          <dd className="text-right font-bold tabular-nums">{formatR(summary.avgR)}</dd>
          <dt className="text-text-muted">Итог в R</dt>
          <dd className="text-right font-bold tabular-nums">{formatR(summary.totalR)}</dd>
          <dt className="text-text-muted">Профит-фактор</dt>
          <dd className="text-right font-bold tabular-nums">{formatNumber(pf, 2)}</dd>
        </dl>
      ) : null}
      {done > 0 && done < strategy.targetTrades && (
        <p className="text-xs text-text-muted">
          До {strategy.targetTrades} сделок выводы делать рано: на малой выборке результат — в
          основном случайность.
        </p>
      )}
    </Card>
  );
}

function Checklist({ rules }: { rules: readonly string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => rules.map(() => false));
  const all = checked.every(Boolean);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-bold text-text-muted">
        Перед входом отметь выполненные правила
      </legend>
      {rules.map((rule, i) => (
        <label key={rule} className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-(--epic)"
            checked={checked[i] ?? false}
            onChange={(e) =>
              setChecked((prev) => prev.map((v, k) => (k === i ? e.target.checked : v)))
            }
          />
          <span>{rule}</span>
        </label>
      ))}
      <p className={all ? 'text-sm font-bold text-bull' : 'text-sm text-text-muted'} role="status">
        {all
          ? 'Все правила выполнены — сетап по стратегии.'
          : 'Не всё выполнено? Честный ответ — «Пропустить».'}
      </p>
    </fieldset>
  );
}
