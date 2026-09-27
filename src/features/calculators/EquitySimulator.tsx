import { useMemo, useState } from 'react';
import { Dices, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatNumber, formatPct } from '@/lib/format';
import { runMonteCarlo, MONTE_CARLO_LIMITS } from '@/lib/sim/monteCarlo';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { EquityCurves } from './EquityCurves';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  winratePct: number | null;
  rr: number | null;
  riskPct: number | null;
  trades: number | null;
}

const DEFAULTS: Inputs = { winratePct: 45, rr: 2, riskPct: 1, trades: 100 };
const isInputs = isShape<Inputs>({
  winratePct: 'number',
  rr: 'number',
  riskPct: 'number',
  trades: 'number',
});

/** Curves drawn on the chart; the statistics use all runs. */
const SHOWN_CURVES = 20;
const RUNS = 500;

/** Monte Carlo: the same strategy, many random orders of wins and losses (m09-l04). */
export function EquitySimulator() {
  const { inputs, set, reset } = useCalculator('montecarlo', DEFAULTS, isInputs);
  const [seed, setSeed] = useState(1);
  const { winratePct, rr, riskPct, trades } = inputs;
  const result = useMemo(
    () =>
      winratePct !== null && rr !== null && riskPct !== null && trades !== null
        ? runMonteCarlo({
            winrate: winratePct / 100,
            rr,
            riskPct,
            trades,
            runs: RUNS,
            seed,
            keepCurves: SHOWN_CURVES,
          })
        : null,
    [winratePct, rr, riskPct, trades, seed],
  );

  return (
    <CalculatorCard
      icon={Dices}
      title="Симулятор капитала"
      onReset={() => {
        reset();
        setSeed(1);
      }}
      emptyHint={`Винрейт 0–100%, R:R больше 0, риск от 0 до 100%, сделок — целое от 1 до ${MONTE_CARLO_LIMITS.maxTrades}.`}
      result={
        result && (
          <>
            <EquityCurves
              curves={result.curves}
              baseline={1}
              label={`${SHOWN_CURVES} случайных кривых капитала одной и той же стратегии`}
            />
            <ResultValue
              label={`Медианный результат за ${formatNumber(trades, 0)} сделок`}
              value={`${result.medianFinalPct >= 0 ? '+' : ''}${formatNumber(result.medianFinalPct, 1)}%`}
              sub={`в минусе закончили ${formatPct(result.losingShare, 0)} из ${RUNS} прогонов`}
            />
            <ResultRows
              rows={[
                ['Макс. просадка: обычно', `−${formatNumber(result.drawdownP50, 1)}%`],
                [
                  'Макс. просадка: в 1 из 10 случаев хуже',
                  `−${formatNumber(result.drawdownP90, 1)}%`,
                ],
                ['Серия убытков подряд: обычно', formatNumber(result.streakP50, 0)],
                ['Серия: в 1 из 10 случаев длиннее', formatNumber(result.streakP90, 0)],
              ]}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              leftIcon={<Shuffle className="size-4" aria-hidden="true" />}
              onClick={() => setSeed((s) => s + 1)}
            >
              Другие случайные серии
            </Button>
          </>
        )
      }
      howTo={
        <>
          <p>
            Каждый прогон — случайная последовательность сделок: выигрыш с вероятностью W приносит
            R:R × риск, проигрыш забирает риск. Риск считается от текущего баланса.
          </p>
          <p>
            Одна и та же стратегия даёт очень разные кривые. Готовься к просадкам и сериям из нижних
            строк — они нормальны даже для прибыльной системы. Комиссии не учтены.
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
        <NumberField label="R:R" value={rr} onChange={(v) => set({ rr: v })} min={0} />
        <NumberField
          label="Риск на сделку"
          value={riskPct}
          onChange={(v) => set({ riskPct: v })}
          unit="%"
          min={0}
          max={99}
        />
        <NumberField
          label="Сделок"
          value={trades}
          onChange={(v) => set({ trades: v })}
          min={1}
          max={MONTE_CARLO_LIMITS.maxTrades}
        />
      </div>
    </CalculatorCard>
  );
}
