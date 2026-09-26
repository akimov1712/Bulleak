import { Suspense, useState } from 'react';
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
import { SIM_START_BALANCE } from '@/lib/trading/simPlan';
import { forgetDataset } from '@/features/charts/useDataset';
import type { SimIndicators } from '@/features/simulator/SimChart';
import { SimSession } from '@/features/simulator/SimSession';

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
  usePageTitle('Тренажёр');
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
  const [seed, setSeed] = useState(() => Date.now());
  const [balance, setBalance] = useStoredState('tc-sim:balance', SIM_START_BALANCE, isBalance);
  const dataset: DatasetName = `${instrument.symbol}-${instrument.interval}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Тренажёр"
        subtitle="Сделки вслепую на реальной истории Bybit"
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
      <div className="flex flex-wrap items-end gap-4">
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
            key={`${dataset}:${seed}`}
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
    </div>
  );
}
