import { useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Skeleton';
import { journalRepo } from '@/db/journalRepo';
import { simRepo } from '@/db/simRepo';
import { formatNumber, formatPct, formatR, formatUsd } from '@/lib/format';
import { journalMetrics } from '@/lib/journal/metrics';
import { rHistogram, simStats } from '@/lib/stats/simulator';
import { filterTrades, type SimTradeKind } from '@/lib/trading/simStats';
import type { JournalAccount } from '@/types/trading';
import { EquityCurves } from '../calculators/EquityCurves';
import { JournalBreakdowns, JournalKpis } from '../journal/JournalOverview';
import { ACCOUNT_LABEL, ACCOUNTS } from '../journal/labels';
import { Bars } from './charts';

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function LoadError({ message }: { message: string }) {
  return <Card role="alert">{message}</Card>;
}

const KIND_OPTIONS: { value: SimTradeKind; label: string }[] = [
  { value: 'free', label: 'Свободные' },
  { value: 'scenario', label: 'Сценарии' },
  { value: 'backtest', label: 'Бэктест' },
];

/** Simulator tab: summary, virtual balance curve and the distribution of results in R. */
export function SimulatorStats() {
  const [kind, setKind] = useState<SimTradeKind>('free');
  const loaded = useLiveQuery(() => simRepo.list().catch(toError), []);
  if (loaded === undefined) return null;
  if (loaded instanceof Error) return <LoadError message={loaded.message} />;
  if (loaded.length === 0) {
    return (
      <EmptyState
        art={<Mascot mood="thinking" size={120} />}
        title="Сделок в тренажёре пока нет"
        description="Открой тренажёр и сыграй несколько сделок на истории — статистика появится здесь."
        action={
          <Link to={paths.simulator()} className="font-bold text-info underline">
            В тренажёр
          </Link>
        }
      />
    );
  }
  const trades = filterTrades(loaded, kind);
  const s = simStats(trades);
  const bins = rHistogram(trades.map((t) => t.r));
  const tiles: [string, string][] = [
    ['Сделок', String(s.count)],
    ['Винрейт', formatPct(s.winrate, 0)],
    ['Средний R', formatR(s.avgR)],
    ['Итог', `${formatR(s.totalR)} · ${formatUsd(s.totalPnl)}`],
    ['Профит-фактор', formatNumber(s.profitFactor, 2)],
    ['Лучшая / худшая', `${formatR(s.bestR)} / ${formatR(s.worstR)}`],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Какие сделки"
        hideLabel
        value={kind}
        options={KIND_OPTIONS}
        onChange={setKind}
      />
      {trades.length === 0 ? (
        <p className="text-text-muted">Таких сделок пока нет.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map(([label, value]) => (
              <Card key={label} padding="sm">
                <dt className="text-sm font-bold text-text-muted">{label}</dt>
                <dd className="text-lg font-extrabold tabular-nums">{value}</dd>
              </Card>
            ))}
          </dl>
          {s.balanceCurve.length > 2 && (
            <Card className="flex flex-col gap-2">
              <h2 className="font-extrabold">Виртуальный баланс</h2>
              <EquityCurves
                curves={[s.balanceCurve]}
                baseline={s.balanceCurve[0]}
                label="Баланс тренажёра после каждой сделки"
              />
            </Card>
          )}
          <Card className="flex flex-col gap-2">
            <h2 className="font-extrabold">Распределение результатов в R</h2>
            <Bars
              values={bins.map((b) => (b.from < 0 ? -b.count : b.count))}
              labels={bins.map(
                (b) => `${formatNumber(b.from, 1)}…${formatNumber(b.from + 0.5, 1)}R: ${b.count}`,
              )}
              label="Сколько сделок закрылось с каждым результатом в R"
              tone="fill-bull"
            />
            <p className="text-xs text-text-muted">
              Слева убытки (красные), справа прибыль (зелёные); шаг — 0,5R.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

/** Journal tab: the journal metrics with an account filter. */
export function JournalStats() {
  const [account, setAccount] = useState<JournalAccount | 'all'>('all');
  const loaded = useLiveQuery(() => journalRepo.list().catch(toError), []);
  if (loaded === undefined) return null;
  if (loaded instanceof Error) return <LoadError message={loaded.message} />;
  if (loaded.length === 0) {
    return (
      <EmptyState
        art={<Mascot mood="thinking" size={120} />}
        title="Журнал пуст"
        description="Записывай сделки на демо, тестнете и реальном счёте — здесь появятся метрики."
        action={
          <Link to={paths.journalNew()} className="font-bold text-info underline">
            Записать сделку
          </Link>
        }
      />
    );
  }
  const trades = account === 'all' ? loaded : loaded.filter((t) => t.account === account);
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Счёт"
        hideLabel
        value={account}
        options={[
          { value: 'all', label: 'Все' },
          ...ACCOUNTS.map((a) => ({ value: a, label: ACCOUNT_LABEL[a] })),
        ]}
        onChange={setAccount}
      />
      <JournalKpis metrics={journalMetrics(trades)} />
      <JournalBreakdowns trades={trades} />
    </div>
  );
}
