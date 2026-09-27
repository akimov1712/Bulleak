import { Scale } from 'lucide-react';
import { formatNumber, formatUsd } from '@/lib/format';
import { positionSize } from '@/lib/trading/position';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  balance: number | null;
  riskPct: number | null;
  entry: number | null;
  stop: number | null;
  leverage: number | null;
}

const DEFAULTS: Inputs = { balance: 1000, riskPct: 1, entry: 60_000, stop: 59_000, leverage: 1 };
const isInputs = isShape<Inputs>({
  balance: 'number',
  riskPct: 'number',
  entry: 'number',
  stop: 'number',
  leverage: 'number',
});

/** Position size from the risk: how many coins to buy so a stop costs exactly risk %. */
export function PositionCalc() {
  const { inputs, set, reset } = useCalculator('position', DEFAULTS, isInputs);
  const { balance, riskPct, entry, stop, leverage } = inputs;
  const result =
    balance !== null && riskPct !== null && entry !== null && stop !== null
      ? positionSize({ balance, riskPct, entry, stop, leverage: leverage ?? 1 })
      : null;

  return (
    <CalculatorCard
      icon={Scale}
      title="Размер позиции"
      onReset={reset}
      emptyHint="Заполни баланс, риск (0–100%), вход и стоп; стоп не должен совпадать со входом."
      result={
        result && (
          <>
            <ResultValue
              label="Объём позиции"
              value={`${formatNumber(result.qty, 6)} монет`}
              sub={`на ${formatUsd(result.notional)} по цене входа`}
            />
            <ResultRows
              rows={[
                ['Риск до стопа', formatUsd(result.riskUsd)],
                ['Расстояние до стопа', `${formatNumber(result.stopDistancePct, 2)}%`],
                [`Маржа при плече ${formatNumber(leverage ?? 1, 0)}×`, formatUsd(result.margin)],
              ]}
            />
            {result.margin > (balance ?? 0) && (
              <p className="mt-3 rounded-2xl border-2 border-warn bg-warn-soft p-3 text-sm">
                Маржа больше баланса: при таком плече позицию не открыть. Отодвинь стоп или уменьши
                риск — не повышай плечо ради размера.
              </p>
            )}
          </>
        )
      }
      howTo={
        <>
          <p>
            <b>Объём = баланс × риск% ÷ |вход − стоп|.</b> Сначала решаешь, сколько готов потерять,
            потом из расстояния до стопа получаешь размер — а не наоборот.
          </p>
          <p>
            Плечо не меняет риск в долларах: оно лишь уменьшает маржу (стоимость ÷ плечо). На бирже
            объём округляют <b>вниз</b> до шага инструмента (у BTCUSDT — 0,001).
          </p>
        </>
      }
      note="Без учёта комиссий: при срабатывании стопа убыток будет чуть больше риска."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Баланс"
          value={balance}
          onChange={(v) => set({ balance: v })}
          unit="$"
          min={0}
        />
        <NumberField
          label="Риск на сделку"
          value={riskPct}
          onChange={(v) => set({ riskPct: v })}
          unit="%"
          min={0}
          max={100}
        />
        <NumberField label="Цена входа" value={entry} onChange={(v) => set({ entry: v })} min={0} />
        <NumberField label="Стоп-лосс" value={stop} onChange={(v) => set({ stop: v })} min={0} />
        <NumberField
          label="Плечо (для маржи)"
          value={leverage}
          onChange={(v) => set({ leverage: v })}
          unit="×"
          min={1}
          max={100}
        />
      </div>
    </CalculatorCard>
  );
}
