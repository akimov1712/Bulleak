import { Flame } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { formatNumber } from '@/lib/format';
import { BYBIT_BASE_FEES } from '@/lib/trading/fees';
import {
  bankruptcyPrice,
  BTCUSDT_MMR_PCT,
  liquidationDistancePct,
  liquidationPrice,
  stopBeyondLiquidation,
} from '@/lib/trading/liquidation';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  side: 'long' | 'short';
  entry: number | null;
  leverage: number | null;
  mmrPct: number | null;
  stop: number | null;
  withFee: boolean;
}

const DEFAULTS: Inputs = {
  side: 'long',
  entry: 60_000,
  leverage: 10,
  mmrPct: BTCUSDT_MMR_PCT,
  stop: null,
  withFee: false,
};
const isInputs = isShape<Inputs>({
  side: ['long', 'short'],
  entry: 'number',
  leverage: 'number',
  mmrPct: 'number',
  stop: 'number',
  withFee: 'boolean',
});

/** Approximate liquidation price of an isolated USDT perpetual position (Bybit formula). */
export function LiquidationCalc() {
  const { inputs, set, reset } = useCalculator('liquidation', DEFAULTS, isInputs);
  const { side, entry, leverage, mmrPct, stop } = inputs;
  const liq =
    entry !== null && leverage !== null && mmrPct !== null
      ? liquidationPrice({
          side,
          entry,
          leverage,
          mmrPct,
          closeFeePct: inputs.withFee ? BYBIT_BASE_FEES.perpetual.taker : 0,
        })
      : null;
  const distance = liq !== null && entry !== null ? liquidationDistancePct(entry, liq) : null;
  const stopTooFar = liq !== null && stop !== null && stopBeyondLiquidation(side, stop, liq);

  return (
    <CalculatorCard
      icon={Flame}
      title="Цена ликвидации"
      onReset={reset}
      emptyHint="Заполни вход, плечо (от 1×) и ставку MMR; при таком плече маржа должна быть больше поддерживающей."
      result={
        liq !== null && (
          <>
            <ResultValue
              label="Ликвидация примерно по"
              value={formatNumber(liq, 2)}
              sub={`в ${formatNumber(distance, 2)}% от входа`}
            />
            <ResultRows
              rows={[
                [
                  'Цена банкротства (маржа = 0)',
                  formatNumber(
                    entry !== null && leverage !== null
                      ? bankruptcyPrice(side, entry, leverage)
                      : null,
                    2,
                  ),
                ],
              ]}
            />
            {stop !== null &&
              (stopTooFar ? (
                <p className="mt-3 rounded-2xl border-2 border-bear bg-bear-soft p-3 text-sm">
                  <b>Стоп дальше ликвидации.</b> Позицию закроют принудительно раньше, чем сработает
                  стоп: уменьши плечо или придвинь стоп.
                </p>
              ) : (
                <p className="mt-3 rounded-2xl border-2 border-border bg-surface-2 p-3 text-sm">
                  Стоп сработает раньше ликвидации — так и должно быть.
                </p>
              ))}
          </>
        )
      }
      howTo={
        <>
          <p>
            Bybit (изолированная маржа): ликвидация = вход ∓ (начальная маржа − поддерживающая
            маржа) ÷ размер. Без комиссий это <b>лонг: вход × (1 − 1/плечо + MMR)</b>,{' '}
            <b>шорт: вход × (1 + 1/плечо − MMR)</b>.
          </p>
          <p>
            Поддерживающая маржа (MMR) у BTCUSDT на первом уровне лимита риска — 0,5%. Bybit
            добавляет к ней оценочную комиссию закрытия — отметь галочку, чтобы учесть её.
          </p>
        </>
      }
      note="Приблизительно, для первого уровня лимита риска. Точная цена всегда видна в интерфейсе Bybit."
    >
      <Segmented
        label="Направление"
        value={side}
        options={[
          { value: 'long', label: 'Лонг' },
          { value: 'short', label: 'Шорт' },
        ]}
        onChange={(v) => set({ side: v })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Цена входа" value={entry} onChange={(v) => set({ entry: v })} min={0} />
        <NumberField
          label="Плечо"
          value={leverage}
          onChange={(v) => set({ leverage: v })}
          unit="×"
          min={1}
          max={200}
        />
        <NumberField
          label="MMR (поддерживающая маржа)"
          value={mmrPct}
          onChange={(v) => set({ mmrPct: v })}
          unit="%"
          min={0}
        />
        <NumberField
          label="Стоп-лосс (необязательно)"
          value={stop}
          onChange={(v) => set({ stop: v })}
          min={0}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          className="size-4"
          checked={inputs.withFee}
          onChange={(e) => set({ withFee: e.target.checked })}
        />
        Учесть комиссию закрытия (тейкер {formatNumber(BYBIT_BASE_FEES.perpetual.taker, 3)}%)
      </label>
    </CalculatorCard>
  );
}
