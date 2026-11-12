import { Suspense, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { LazyCandleChart } from '@/features/charts/LazyCandleChart';
import { useDataset } from '@/features/charts/useDataset';
import {
  CONFIDENCE_LEVELS,
  FORECAST_HISTORY,
  FORECAST_HORIZON,
  FORECAST_OUTCOMES,
  forecastOutcome,
  forecastSetup,
  OUTCOME_LABEL,
  pickForecastMoment,
  summarizeForecasts,
  type Confidence,
  type ForecastOutcome,
} from '@/lib/practice/forecast';
import { mulberry32, pick } from '@/lib/random';
import type { DatasetName } from '@/lib/trading/candles';
import { usePractice } from '@/store/practiceStore';

const DATASETS: DatasetName[] = ['BTCUSDT-240', 'ETHUSDT-240', 'SOLUSDT-240'];
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const score = (v: number | null) =>
  v === null
    ? '—'
    : v.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function Round({
  dataset,
  seed,
  onNext,
}: {
  dataset: DatasetName;
  seed: number;
  onNext: () => void;
}) {
  const { candles } = useDataset(dataset);
  const record = usePractice((s) => s.recordForecast);
  const round = useMemo(() => {
    const at = pickForecastMoment(candles.length, mulberry32(seed));
    const setup = at === null ? null : forecastSetup(candles, at);
    const outcome = setup ? forecastOutcome(candles, setup) : null;
    return setup && outcome ? { setup, outcome } : null;
  }, [candles, seed]);
  const [choice, setChoice] = useState<ForecastOutcome | null>(null);
  const [confidence, setConfidence] = useState<Confidence>(0.6);
  const [revealed, setRevealed] = useState(false);

  if (!round) return <p>Не хватает данных для этого момента. Попробуй другой.</p>;
  const { setup, outcome } = round;
  const moment = candles[setup.at];
  const end = candles[setup.at + FORECAST_HORIZON];
  if (!moment || !end) return null;
  const right = choice === outcome;

  return (
    <div className="flex flex-col gap-4">
      <LazyCandleChart
        // A new key per reveal: the chart re-fits to the new range.
        key={`${dataset}-${seed}-${revealed}`}
        dataset={dataset}
        from={{ index: setup.at - FORECAST_HISTORY }}
        to={{ index: revealed ? setup.at + FORECAST_HORIZON : setup.at }}
        height={360}
        interactive={false}
        annotations={[
          {
            type: 'hline',
            price: setup.close + setup.band,
            label: 'Выше — рост',
            tone: 'info',
            dashed: true,
          },
          {
            type: 'hline',
            price: setup.close - setup.band,
            label: 'Ниже — падение',
            tone: 'info',
            dashed: true,
          },
          ...(revealed
            ? [{ type: 'vline' as const, time: { index: setup.at }, label: 'Здесь решал' }]
            : []),
        ]}
      />
      <Card className="flex flex-col gap-4">
        <p>
          Что будет через {FORECAST_HORIZON} свечей 4H (двое суток)? «Вырастет» — закрытие выше
          полосы ({fmt(setup.close + setup.band)}), «Упадёт» — ниже {fmt(setup.close - setup.band)},
          иначе — останется в диапазоне.
        </p>
        <Segmented<ForecastOutcome>
          label="Прогноз"
          value={choice ?? ('' as ForecastOutcome)}
          options={FORECAST_OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABEL[o] }))}
          onChange={setChoice}
          disabled={revealed}
        />
        <Segmented<string>
          label="Насколько уверен"
          value={String(confidence)}
          options={CONFIDENCE_LEVELS.map((c) => ({ value: String(c), label: pct(c) }))}
          onChange={(v) => {
            const c = CONFIDENCE_LEVELS.find((x) => String(x) === v);
            if (c) setConfidence(c);
          }}
          disabled={revealed}
        />
        {!revealed ? (
          <Button
            disabled={choice === null}
            onClick={() => {
              if (!choice) return;
              setRevealed(true);
              record({ dataset, time: moment.t, at: setup.at, pick: choice, confidence, outcome });
            }}
          >
            Показать, что было
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p role="status" className={`font-bold ${right ? 'text-bull' : 'text-bear'}`}>
              {right ? 'Угадал' : 'Не угадал'}: {OUTCOME_LABEL[outcome].toLowerCase()} — закрытие{' '}
              {fmt(end.c)}.
            </p>
            <p className="text-sm text-text-muted">
              Один прогноз ничего не говорит о навыке. Смотри на калибровку ниже: при уверенности 80
              % ты должен оказываться прав примерно в 8 случаях из 10.
            </p>
            <Button variant="secondary" onClick={onNext}>
              Следующий момент
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Calibration() {
  const forecasts = usePractice((s) => s.forecasts);
  const summary = summarizeForecasts(forecasts);
  if (summary.count === 0) return null;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Калибровка</h2>
      <p className="text-sm text-text-muted">
        Прогнозов: {summary.count}, верных {pct(summary.hitRate)}. Оценка Брайера{' '}
        {score(summary.brier)} (ниже — лучше; те же ответы с уверенностью 33 % дали бы{' '}
        {score(summary.baseline)}: если твоя оценка выше, уверенность мешает).
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="py-1 font-medium">Уверенность</th>
            <th className="py-1 font-medium">Прогнозов</th>
            <th className="py-1 font-medium">Верных</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((r) => (
            <tr key={r.confidence} className="border-t border-border">
              <td className="py-1">{pct(r.confidence)}</td>
              <td className="py-1">{r.count}</td>
              <td className="py-1">{pct(r.hitRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.overconfident && (
        <p className="text-sm font-bold text-warn">
          При уверенности 80 % ты прав заметно реже. Это переуверенность — та же ошибка, что
          заставляет брать слишком большой риск.
        </p>
      )}
    </Card>
  );
}

/** «Что дальше?»: a forecast on hidden history with a confidence mark, then the truth. */
export function ForecastPanel({ seed: initialSeed }: { seed: number }) {
  const [seed, setSeed] = useState(initialSeed);
  const dataset = pick(DATASETS, mulberry32(seed + 1)) ?? 'BTCUSDT-240';
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Round key={seed} dataset={dataset} seed={seed} onNext={() => setSeed((s) => s + 7919)} />
      </Suspense>
      <Calibration />
    </div>
  );
}
