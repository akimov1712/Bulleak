import { Suspense, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { RotateCcw, Shuffle, Wallet } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useStoredState } from '@/hooks/useStoredState';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  DATASET_INTERVALS,
  DATASET_SYMBOLS,
  INTERVAL_LABEL,
  type DatasetInterval,
  type DatasetName,
  type DatasetSymbol,
} from '@/lib/trading/candles';
import { formatUsd } from '@/lib/format';
import { SIM_BALANCE_KEY, SIM_START_BALANCE } from '@/lib/trading/simPlan';
import { forgetDataset } from '@/features/charts/useDataset';
import type { SimIndicators } from '@/features/simulator/SimChart';
import { SimSession } from '@/features/simulator/SimSession';
import { SimHistory } from '@/features/simulator/SimHistory';
import { getScenario } from '@/content/scenarios';
import { getStrategy } from '@/content/strategies';
import { EmptyState } from '@/components/ui/Skeleton';
import { Mascot } from '@/components/mascot/Mascot';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import { isDatasetName } from '@/lib/trading/candles';

interface Instrument {
  symbol: DatasetSymbol;
  interval: DatasetInterval;
}

const isInstrument = (v: unknown): v is Instrument => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    (DATASET_SYMBOLS as readonly unknown[]).includes(r.symbol) &&
    (DATASET_INTERVALS as readonly unknown[]).includes(r.interval)
  );
};

const DEFAULT_INDICATORS: SimIndicators = {
  ema20: false,
  ema50: false,
  ema200: false,
  rsi: false,
  volume: true,
};

const isIndicators = (v: unknown): v is SimIndicators =>
  typeof v === 'object' &&
  v !== null &&
  Object.keys(DEFAULT_INDICATORS).every(
    (k) => typeof (v as Record<string, unknown>)[k] === 'boolean',
  );

const isBalance = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const SYMBOL_OPTIONS = DATASET_SYMBOLS.map((s) => ({ value: s, label: s.replace('USDT', '') }));
const INTERVAL_OPTIONS = DATASET_INTERVALS.map((i) => ({ value: i, label: INTERVAL_LABEL[i] }));

export function SimulatorPage() {
  const { scenarioId } = useParams();
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  // ?backtest=tps: a shareable link from lesson m11-l04 ("Начать бэктест TPS").
  const [search, setSearch] = useSearchParams();
  const strategy = scenario ? undefined : getStrategy(search.get('backtest') ?? '');
  // ?seed=123 reproduces a free-mode start (handy for e2e tests and sharing a moment).
  const [seed, setSeed] = useState(() => {
    const fromUrl = Number(search.get('seed'));
    return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Date.now();
  });
  usePageTitle(scenario ? `Сценарий: ${scenario.title}` : 'Тренажёр');
  const [instrument, setInstrument] = useStoredState<Instrument>(
    'tc-sim:instrument',
    { symbol: 'BTCUSDT', interval: '240' },
    isInstrument,
  );
  const [indicators, setIndicators] = useStoredState<SimIndicators>(
    'tc-sim:indicators',
    DEFAULT_INDICATORS,
    isIndicators,
  );
  const [balance, setBalance] = useStoredState(SIM_BALANCE_KEY, SIM_START_BALANCE, isBalance);
  const freeDataset: DatasetName = `${instrument.symbol}-${instrument.interval}`;
  const dataset: DatasetName =
    scenario && isDatasetName(scenario.dataset) ? scenario.dataset : freeDataset;

  if (scenarioId && !scenario) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="shocked" size={130} />}
        title="Сценарий не найден"
        action={
          <Link to={paths.simulator()} className={buttonClass()}>
            В свободный режим
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={scenario ? scenario.title : 'Тренажёр'}
        subtitle={scenario ? 'Сценарий тренажёра' : 'Сделки вслепую на реальной истории Bybit'}
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-2xl border-2 border-border bg-surface px-3 py-2 font-extrabold tabular-nums">
              <Wallet className="size-5 text-info" aria-hidden="true" />
              <span className="sr-only">Виртуальный баланс:</span>
              {formatUsd(balance)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
              disabled={balance === SIM_START_BALANCE}
              onClick={() => setBalance(SIM_START_BALANCE)}
            >
              Сбросить
            </Button>
          </div>
        }
      />
      {scenario ? (
        <Link to={paths.simulator()} className="self-start font-bold text-info hover:underline">
          ← Свободный режим
        </Link>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <Segmented
            label="Режим"
            value={strategy ? strategy.tag : 'free'}
            options={[
              { value: 'free', label: 'Свободный' },
              { value: 'tps', label: 'Бэктест TPS' },
            ]}
            onChange={(mode) => setSearch(mode === 'free' ? {} : { backtest: mode })}
          />
          <Segmented
            label="Инструмент"
            value={instrument.symbol}
            options={SYMBOL_OPTIONS}
            onChange={(symbol) => setInstrument({ ...instrument, symbol })}
          />
          <Segmented
            label="Таймфрейм"
            value={instrument.interval}
            options={INTERVAL_OPTIONS}
            onChange={(interval) => setInstrument({ ...instrument, interval })}
          />
          <Button
            variant="secondary"
            leftIcon={<Shuffle className="size-5" aria-hidden="true" />}
            onClick={() => setSeed(Date.now())}
          >
            Другой момент
          </Button>
        </div>
      )}
      <ErrorBoundary
        resetKey={dataset}
        fallback={(error, reset) => (
          <Card className="flex flex-col items-start gap-2" role="alert">
            <p>Не удалось загрузить график: {error.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                forgetDataset(dataset);
                reset();
              }}
            >
              Повторить
            </Button>
          </Card>
        )}
      >
        <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-2xl" />}>
          <SimSession
            key={
              scenario ? `scenario:${scenario.id}` : `${strategy?.tag ?? 'free'}:${dataset}:${seed}`
            }
            scenario={scenario}
            strategy={strategy}
            dataset={dataset}
            seed={seed}
            indicators={indicators}
            onToggleIndicator={(key) => setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))}
            balance={balance}
            onBalance={setBalance}
            onNewPoint={() => setSeed(Date.now())}
          />
        </Suspense>
      </ErrorBoundary>
      <SimHistory
        key={strategy ? 'backtest' : scenario ? 'scenario' : 'free'}
        initialFilter={strategy ? 'backtest' : scenario ? 'scenario' : 'free'}
      />
    </div>
  );
}
