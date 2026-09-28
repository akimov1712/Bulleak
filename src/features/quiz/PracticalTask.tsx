import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import type { PracticalScenario } from '@/content/final-exam';
import { LazyCandleChart } from '@/features/charts/LazyCandleChart';
import { useDataset } from '@/features/charts/useDataset';
import { formatNumber } from '@/lib/format';
import { isDatasetName } from '@/lib/trading/candles';
import type { PracticalAnswer } from '@/lib/quiz/practical';
import type { SimDecision } from '@/types/trading';

const DECISIONS: { value: SimDecision; label: string }[] = [
  { value: 'long', label: 'Лонг' },
  { value: 'short', label: 'Шорт' },
  { value: 'skip', label: 'Пропустить' },
];

interface PracticalTaskProps {
  scenario: PracticalScenario;
  index: number;
  total: number;
  onSubmit: (answer: PracticalAnswer) => void;
}

/** One practical scenario of the final exam: chart up to the decision candle and the trade form. */
export function PracticalTask(props: PracticalTaskProps) {
  return (
    <Suspense
      fallback={
        <Card className="flex justify-center p-10">
          <Spinner label="Загружаю график" />
        </Card>
      }
    >
      <PracticalForm key={props.scenario.id} {...props} />
    </Suspense>
  );
}

function PracticalForm({ scenario, index, total, onSubmit }: PracticalTaskProps) {
  const name = isDatasetName(scenario.dataset) ? scenario.dataset : 'BTCUSDT-60';
  const dataset = useDataset(name);
  const entry = dataset.candles[scenario.startIndex]?.c ?? 0;
  const [decision, setDecision] = useState<SimDecision | ''>('');
  const [sl, setSl] = useState<number | null>(null);
  const [tp, setTp] = useState<number | null>(null);
  const [riskPct, setRiskPct] = useState<number | null>(1);
  const trade = decision === 'long' || decision === 'short';
  const rr =
    trade && sl !== null && tp !== null && sl !== entry
      ? Math.abs(tp - entry) / Math.abs(entry - sl)
      : null;
  const ready = decision === 'skip' || (trade && sl !== null && tp !== null && riskPct !== null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-bold text-text-muted">
        Практическая часть · задача {index + 1} из {total}
      </p>
      <h1 className="text-2xl font-extrabold">{scenario.title}</h1>
      <LazyCandleChart
        dataset={name}
        from={{ index: Math.max(0, scenario.startIndex - 90) }}
        to={{ index: scenario.startIndex }}
        caption="Часовой график. Будущие свечи скрыты."
      />
      <p>{scenario.task}</p>
      <Card className="flex flex-col gap-4">
        <p>
          Вход по рынку:{' '}
          <span className="font-extrabold tabular-nums">{formatNumber(entry, 2)}</span>
        </p>
        <Segmented<SimDecision | ''>
          label="Решение"
          value={decision}
          options={DECISIONS}
          onChange={setDecision}
        />
        {trade && (
          <div className="grid gap-3 sm:grid-cols-3">
            <LabeledNumber label="Стоп-лосс" value={sl} onChange={setSl} />
            <LabeledNumber label="Тейк-профит" value={tp} onChange={setTp} />
            <LabeledNumber label="Риск на сделку" value={riskPct} onChange={setRiskPct} unit="%" />
          </div>
        )}
        {trade && (
          <p className="text-sm text-text-muted">
            R:R по твоим уровням: {rr === null ? '—' : `1 : ${formatNumber(rr, 2)}`}
          </p>
        )}
        <Button
          size="lg"
          disabled={!ready}
          onClick={() => decision !== '' && onSubmit({ decision, entry, sl, tp, riskPct })}
        >
          {index + 1 < total ? 'Ответить и дальше' : 'Ответить и завершить'}
        </Button>
      </Card>
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-bold text-text-muted">{label}</span>
      <NumberInput value={value} onValueChange={onChange} unit={unit} min={0} aria-label={label} />
    </label>
  );
}
