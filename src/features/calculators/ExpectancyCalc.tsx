import { Sigma } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber, formatR } from '@/lib/format';
import { expectancyProjection } from '@/lib/trading/rr';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  winratePct: number | null;
  avgWinR: number | null;
  avgLossR: number | null;
  tradesPerMonth: number | null;
  riskPct: number | null;
}

const DEFAULTS: Inputs = {
  winratePct: 40,
  avgWinR: 2,
  avgLossR: 1,
  tradesPerMonth: 20,
  riskPct: 1,
};
const isInputs = isShape<Inputs>({
  winratePct: 'number',
  avgWinR: 'number',
  avgLossR: 'number',
  tradesPerMonth: 'number',
  riskPct: 'number',
});

/** Expectancy per trade in R and what it means for a month. */
export function ExpectancyCalc() {
  const { inputs, set, reset } = useCalculator('expectancy', DEFAULTS, isInputs);
  const { winratePct, avgWinR, avgLossR, tradesPerMonth, riskPct } = inputs;
  const result =
    winratePct !== null &&
    avgWinR !== null &&
    avgLossR !== null &&
    tradesPerMonth !== null &&
    riskPct !== null
      ? expectancyProjection(winratePct / 100, avgWinR, avgLossR, tradesPerMonth, riskPct)
      : null;

  return (
    <CalculatorCard
      icon={Sigma}
      title="Матожидание"
      onReset={reset}
      emptyHint="Винрейт 0–100%, средние выигрыш и проигрыш в R не меньше 0, целое число сделок и риск больше 0."
      result={
        result && (
          <>
            <ResultValue
              label="В среднем за сделку"
              value={formatR(result.perTradeR)}
              sub={
                result.perTradeR > 0
                  ? 'Стратегия с положительным матожиданием'
                  : 'Стратегия теряет деньги на длинной дистанции'
              }
            />
            <ResultRows
              rows={[
                [`За месяц (${formatNumber(tradesPerMonth, 0)} сделок)`, formatR(result.monthR)],
                ['≈ в % от депозита', `${formatNumber(result.monthPct, 1)}%`],
              ]}
            />
            <p
              className={cn(
                'mt-3 rounded-2xl border-2 p-3 text-sm',
                result.perTradeR > 0 ? 'border-border bg-surface-2' : 'border-bear bg-bear-soft',
              )}
            >
              {result.perTradeR > 0
                ? 'Это среднее на большой выборке: отдельные месяцы будут и в минусе. Проверь разброс в симуляторе капитала.'
                : 'Никакой риск-менеджмент не превратит отрицательное матожидание в прибыль — нужна другая стратегия.'}
            </p>
          </>
        )
      }
      howTo={
        <>
          <p>
            <b>E = W × средний выигрыш − (1 − W) × средний проигрыш</b> (в R). При W = 40%, выигрыше
            2R и проигрыше 1R: 0,4 × 2 − 0,6 × 1 = +0,2R за сделку.
          </p>
          <p>
            Месяц ≈ E × число сделок; в процентах — умножить на риск на сделку. Комиссии и
            проскальзывание уменьшают результат.
          </p>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Винрейт"
          value={winratePct}
          onChange={(v) => set({ winratePct: v })}
          unit="%"
          min={0}
          max={100}
        />
        <NumberField
          label="Средний выигрыш"
          value={avgWinR}
          onChange={(v) => set({ avgWinR: v })}
          unit="R"
          min={0}
        />
        <NumberField
          label="Средний проигрыш"
          value={avgLossR}
          onChange={(v) => set({ avgLossR: v })}
          unit="R"
          min={0}
        />
        <NumberField
          label="Сделок в месяц"
          value={tradesPerMonth}
          onChange={(v) => set({ tradesPerMonth: v })}
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
      </div>
    </CalculatorCard>
  );
}
