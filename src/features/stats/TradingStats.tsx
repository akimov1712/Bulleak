import { useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, XCircle } from 'lucide-react';
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
import { getStrategy } from '@/content/strategies';
import {
  backtestReport,
  FORWARD_TEST_THRESHOLDS,
  type BacktestCheck,
} from '@/lib/trading/backtestReport';
import { filterTrades, type SimTradeKind } from '@/lib/trading/simStats';
import type { JournalAccount, SimTrade } from '@/types/trading';
import { EquityCurves } from '../calculators/EquityCurves';
import { JournalBreakdowns, JournalKpis } from '../journal/JournalOverview';
import { ACCOUNT_LABEL, ACCOUNTS } from '../journal/labels';
import { BacktestVsForward } from './BacktestVsForward';
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
  const tags = [...new Set(trades.map((t) => t.strategyTag ?? ''))].filter(Boolean).sort();
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
          {kind === 'backtest' &&
            tags.map((tag) => (
              <BacktestReportCard
                key={tag}
                tag={tag}
                trades={trades.filter((t) => t.strategyTag === tag)}
              />
            ))}
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

const CHECK_LABEL: Record<BacktestCheck['id'], string> = {
  trades: `Сделок не меньше ${FORWARD_TEST_THRESHOLDS.minTrades}`,
  expectancy: `Матожидание не ниже +${formatNumber(FORWARD_TEST_THRESHOLDS.minExpectancyR, 1)}R после комиссий`,
  profitFactor: `Профит-фактор не ниже ${formatNumber(FORWARD_TEST_THRESHOLDS.minProfitFactor, 1)}`,
  drawdown: `Макс. просадка не больше ${FORWARD_TEST_THRESHOLDS.maxDrawdownPct} % при риске 1 %`,
};

/** Backtest report of one strategy (m11-l05): metrics and the course forward-test thresholds. */
function BacktestReportCard({ tag, trades }: { tag: string; trades: SimTrade[] }) {
  const report = backtestReport(trades);
  const title = getStrategy(tag)?.title ?? tag;
  const tiles: [string, string][] = [
    ['Матожидание', formatR(report.expectancyR)],
    ['Макс. просадка при риске 1 %', `${formatNumber(report.maxDrawdownPct, 1)} %`],
    ['Макс. серия убытков', String(report.maxLosingStreak)],
  ];
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-extrabold">Отчёт бэктеста: {title}</h2>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-bold text-text-muted">{label}</dt>
            <dd className="text-lg font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-1" aria-label="Пороги курса для форвард-теста">
        {report.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            {c.passed ? (
              <CheckCircle2 className="size-5 shrink-0 text-bull" aria-label="выполнено" />
            ) : (
              <XCircle className="size-5 shrink-0 text-bear" aria-label="не выполнено" />
            )}
            {CHECK_LABEL[c.id]}
          </li>
        ))}
      </ul>
      <p className={report.ready ? 'font-bold text-bull' : 'text-text-muted'}>
        {report.ready
          ? 'Пороги пройдены — можно переходить к форвард-тесту на демо или тестнете (урок 11.6).'
          : 'Пороги пока не пройдены. Меняй одно правило за раз и проверяй на новых данных (урок 11.5).'}
      </p>
    </Card>
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
      <BacktestVsForward />
      <JournalKpis metrics={journalMetrics(trades)} />
      <JournalBreakdowns trades={trades} />
    </div>
  );
}
