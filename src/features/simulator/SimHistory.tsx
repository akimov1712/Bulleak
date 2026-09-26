import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Skeleton';
import { Mascot } from '@/components/mascot/Mascot';
import { simRepo } from '@/db/simRepo';
import { getScenario } from '@/content/scenarios';
import { cn } from '@/lib/cn';
import { formatPct, formatR, formatUsd } from '@/lib/format';
import { INTERVAL_LABEL, datasetInterval, isDatasetName } from '@/lib/trading/candles';
import { filterTrades, simSummary, tradeKind, type SimTradeKind } from '@/lib/trading/simStats';
import type { SimOutcome, SimTrade } from '@/types/trading';
import { LazyCandleChart } from '../charts/LazyCandleChart';

// No "all": free, scenario and backtest results are different samples and never share a summary.
const FILTERS: { value: SimTradeKind; label: string }[] = [
  { value: 'free', label: 'Свободные' },
  { value: 'scenario', label: 'Сценарии' },
  { value: 'backtest', label: 'Бэктест' },
];

const OUTCOME_LABEL: Record<SimOutcome, string> = {
  tp: 'тейк',
  sl: 'стоп',
  timeout: 'время',
  manual: 'вручную',
};

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const HISTORY_LIMIT = 500;

type Loaded = { trades: SimTrade[] } | { error: string };

function instrumentLabel(dataset: string): string {
  if (!isDatasetName(dataset)) return dataset;
  return `${dataset.split('-')[0]?.replace('USDT', '')} ${INTERVAL_LABEL[datasetInterval(dataset)]}`;
}

function tradeTitle(t: SimTrade): string {
  const kind = tradeKind(t);
  if (kind === 'scenario') return getScenario(t.scenarioId ?? '')?.title ?? 'Сценарий';
  if (kind === 'backtest') return `Бэктест · ${t.strategyTag ?? ''}`;
  return instrumentLabel(t.dataset);
}

/** Simulator trade history with filters, a summary and a replay of any trade on the chart. */
export function SimHistory({ initialFilter = 'free' }: { initialFilter?: SimTradeKind }) {
  const [filter, setFilter] = useState<SimTradeKind>(initialFilter);
  const [review, setReview] = useState<SimTrade | null>(null);
  const loaded = useLiveQuery<Loaded>(async () => {
    try {
      return { trades: await simRepo.list({ limit: HISTORY_LIMIT }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Не удалось загрузить историю.' };
    }
  }, []);

  if (loaded === undefined) return null;
  if ('error' in loaded) {
    return (
      <Card role="alert" className="text-sm">
        {loaded.error}
      </Card>
    );
  }

  const trades = filterTrades(loaded.trades, filter);
  const summary = simSummary(trades);

  return (
    <section aria-labelledby="sim-history-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="sim-history-title" className="flex items-center gap-2 text-2xl font-extrabold">
          <History className="size-6 text-info" aria-hidden="true" />
          История сделок
        </h2>
        <Segmented
          label="Какие сделки показать"
          hideLabel
          value={filter}
          options={FILTERS}
          onChange={setFilter}
        />
      </div>

      {trades.length === 0 ? (
        <EmptyState
          art={<Mascot mood="thinking" size={110} />}
          title={loaded.trades.length === 0 ? 'Сделок пока нет' : 'Таких сделок нет'}
          description={
            loaded.trades.length === 0
              ? 'Открой первую сделку в тренажёре — она появится здесь с результатом в R.'
              : 'Попробуй другой фильтр.'
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Сделок', String(summary.count)],
              ['Винрейт', formatPct(summary.winrate, 0)],
              ['Средний R', formatR(summary.avgR)],
              ['Итог', formatUsd(summary.totalPnl)],
            ].map(([label, value]) => (
              <Card key={label} padding="sm" className="flex flex-col">
                <dt className="text-sm font-bold text-text-muted">{label}</dt>
                <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
              </Card>
            ))}
          </dl>
          <ul className="flex flex-col gap-2">
            {trades.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setReview(t)}
                  className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border-2 border-border bg-surface px-4 py-2.5 text-left hover:border-info"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{tradeTitle(t)}</span>
                    <span className="text-sm text-text-muted">
                      {dateFormat.format(t.at)} ·{' '}
                      <span className={t.side === 'long' ? 'text-bull' : 'text-bear'}>
                        {t.side === 'long' ? 'Long' : 'Short'}
                      </span>{' '}
                      · {OUTCOME_LABEL[t.outcome]}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-extrabold tabular-nums',
                      t.pnl > 0 ? 'text-bull' : 'text-bear',
                    )}
                  >
                    {formatR(t.r)} · {formatUsd(t.pnl)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={review !== null}
        onClose={() => setReview(null)}
        title={review ? `Сделка: ${tradeTitle(review)}` : 'Сделка'}
        size="lg"
      >
        {review && <TradeReplay trade={review} />}
      </Modal>
    </section>
  );
}

function TradeReplay({ trade }: { trade: SimTrade }) {
  if (!isDatasetName(trade.dataset)) {
    return <p role="alert">Неизвестный набор данных: {trade.dataset}</p>;
  }
  const long = trade.side === 'long';
  return (
    <div className="flex flex-col gap-3">
      <LazyCandleChart
        dataset={trade.dataset}
        from={{ index: Math.max(0, trade.startIndex - 60) }}
        to={{ index: trade.exitIndex + 10 }}
        height={300}
        annotations={[
          { type: 'hline', price: trade.entry, label: 'Вход', tone: 'info', dashed: true },
          { type: 'hline', price: trade.sl, label: 'SL', tone: 'bear' },
          { type: 'hline', price: trade.tp, label: 'TP', tone: 'bull' },
          {
            type: 'marker',
            time: { index: trade.startIndex },
            position: long ? 'below' : 'above',
            text: long ? 'Long' : 'Short',
            tone: 'info',
          },
          {
            type: 'marker',
            time: { index: trade.exitIndex },
            position: long ? 'above' : 'below',
            text: 'Выход',
            tone: trade.pnl > 0 ? 'bull' : 'bear',
          },
        ]}
      />
      <p className="text-sm text-text-muted">
        Результат: <b className="text-text">{formatR(trade.r)}</b> ({formatUsd(trade.pnl)}, комиссии{' '}
        {formatUsd(trade.fees)}). Риск {trade.riskPct}% от баланса {formatUsd(trade.balanceBefore)}.
      </p>
    </div>
  );
}
