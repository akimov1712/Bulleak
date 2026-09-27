import { TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { drawdownAfterLosses, recoveryPct } from '@/lib/trading/drawdown';
import { CalculatorCard, NumberField, ResultRows, ResultValue } from './CalculatorCard';
import { useCalculator } from './useCalculator';
import { isShape } from './validate';

interface Inputs {
  drawdownPct: number | null;
  losses: number | null;
  riskPct: number | null;
}

const DEFAULTS: Inputs = { drawdownPct: 20, losses: 10, riskPct: 2 };
const isInputs = isShape<Inputs>({ drawdownPct: 'number', losses: 'number', riskPct: 'number' });

/** Drawdown asymmetry and what a losing streak does to the balance. */
export function DrawdownCalc() {
  const { inputs, set, reset } = useCalculator('drawdown', DEFAULTS, isInputs);
  const { drawdownPct, losses, riskPct } = inputs;
  const recovery = drawdownPct !== null ? recoveryPct(drawdownPct) : null;
  const streakDd =
    losses !== null && riskPct !== null ? drawdownAfterLosses(losses, riskPct) : null;
  const streakRecovery = streakDd !== null ? recoveryPct(streakDd) : null;

  return (
    <CalculatorCard
      icon={TrendingDown}
      title="Просадка и восстановление"
      onReset={reset}
      emptyHint="Просадка — от 0 до 100% (не включая 100), убытков — целое число, риск — от 0 до 100%."
      result={
        recovery !== null &&
        streakDd !== null && (
          <>
            <ResultValue
              label={`Чтобы отыграть −${formatNumber(drawdownPct, 1)}%, нужен рост`}
              value={`+${formatNumber(recovery, 1)}%`}
            />
            <ResultRows
              rows={[
                [
                  `${formatNumber(losses, 0)} убытков подряд по ${formatNumber(riskPct, 1)}%`,
                  `−${formatNumber(streakDd, 1)}%`,
                ],
                ['Рост, чтобы отыграть серию', `+${formatNumber(streakRecovery, 1)}%`],
              ]}
            />
            <p className="mt-3 rounded-2xl border-2 border-border bg-surface-2 p-3 text-sm">
              Правило курса: при просадке −10% риск на сделку уменьшить вдвое, при −15% — пауза и
              разбор сделок.
            </p>
          </>
        )
      }
      howTo={
        <>
          <p>
            <b>Нужный рост = 1 ÷ (1 − просадка) − 1.</b> Потеряв 50%, нужно заработать 100%:
            проценты считаются от уже уменьшенного счёта.
          </p>
          <p>
            <b>Серия из N убытков по r% = 1 − (1 − r)ᴺ.</b> Риск считается от текущего баланса,
            поэтому 10 убытков по 2% дают не −20%, а около −18,3%.
          </p>
        </>
      }
    >
      <NumberField
        label="Просадка"
        value={drawdownPct}
        onChange={(v) => set({ drawdownPct: v })}
        unit="%"
        min={0}
        max={99.9}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Убытков подряд"
          value={losses}
          onChange={(v) => set({ losses: v })}
          min={0}
        />
        <NumberField
          label="Риск на сделку"
          value={riskPct}
          onChange={(v) => set({ riskPct: v })}
          unit="%"
          min={0}
          max={99.9}
        />
      </div>
    </CalculatorCard>
  );
}
