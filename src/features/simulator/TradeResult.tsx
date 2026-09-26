import { ArrowRight, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatR, formatUsd } from '@/lib/format';
import type { SimResult } from '@/lib/trading/simulate';
import type { SimOutcome } from '@/types/trading';

const OUTCOME_TITLE: Record<SimOutcome, string> = {
  tp: 'Тейк-профит',
  sl: 'Стоп-лосс',
  timeout: 'Время вышло',
  manual: 'Закрыта вручную',
};

export interface TradeResultProps {
  result: SimResult;
  balance: number;
  /** Next decision right after this trade (null when the data ran out). */
  onNext: (() => void) | null;
  onNewPoint: () => void;
}

/** Outcome card after a simulated trade. */
export function TradeResult({ result, balance, onNext, onNewPoint }: TradeResultProps) {
  const win = result.pnl >= 0;
  return (
    <Card className="flex flex-col gap-4" aria-label="Результат сделки">
      <div>
        <p className="text-sm font-bold text-text-muted">{OUTCOME_TITLE[result.outcome]}</p>
        <p
          className={cn('text-3xl font-extrabold tabular-nums', win ? 'text-bull' : 'text-bear')}
          role="status"
        >
          {formatR(result.r)} · {formatUsd(result.pnl)}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">До комиссий</dt>
        <dd className="text-right font-bold tabular-nums">{formatUsd(result.grossPnl)}</dd>
        <dt className="text-text-muted">Комиссии</dt>
        <dd className="text-right font-bold tabular-nums">{formatUsd(-result.fees)}</dd>
        <dt className="text-text-muted">Баланс</dt>
        <dd className="text-right font-bold tabular-nums">{formatUsd(balance)}</dd>
      </dl>
      {result.ambiguous && (
        <p className="rounded-xl bg-warn-soft p-2.5 text-sm">
          <b>Неоднозначная свеча:</b> в ней задеты и стоп, и тейк. По свечам не видно, что было
          раньше, поэтому тренажёр честно считает стоп.
        </p>
      )}
      {result.gap && (
        <p className="rounded-xl bg-warn-soft p-2.5 text-sm">
          <b>Гэп:</b> свеча открылась сразу за уровнем, сделка исполнилась по цене открытия — это
          проскальзывание.
        </p>
      )}
      {result.outcome === 'timeout' && (
        <p className="text-sm text-text-muted">
          За отведённое время цена не дошла ни до стопа, ни до тейка — сделка закрыта по цене
          закрытия.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {onNext && (
          <Button
            size="lg"
            fullWidth
            rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
            onClick={onNext}
          >
            Следующая сделка
          </Button>
        )}
        <Button
          variant="secondary"
          fullWidth
          leftIcon={<Shuffle className="size-5" aria-hidden="true" />}
          onClick={onNewPoint}
        >
          Другой момент
        </Button>
      </div>
    </Card>
  );
}
