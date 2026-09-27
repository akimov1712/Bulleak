import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { journalRepo } from '@/db/journalRepo';
import { JournalBreakdowns, JournalKpis } from '@/features/journal/JournalOverview';
import { ACCOUNT_LABEL, ACCOUNTS } from '@/features/journal/labels';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { formatR, formatUsd } from '@/lib/format';
import { journalMetrics } from '@/lib/journal/metrics';
import type { JournalAccount, JournalTrade } from '@/types/trading';

type AccountFilter = JournalAccount | 'all';
type ResultFilter = 'all' | 'win' | 'loss' | 'open';
type Loaded = { trades: JournalTrade[] } | { error: string };

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
});

function matches(t: JournalTrade, account: AccountFilter, setup: string, result: ResultFilter) {
  if (account !== 'all' && t.account !== account) return false;
  if (setup !== '' && t.setup !== setup) return false;
  if (result === 'open') return t.pnl === undefined;
  if (result === 'win') return (t.pnl ?? 0) > 0;
  if (result === 'loss') return (t.pnl ?? 0) < 0;
  return true;
}

/** /journal — the learner's own trades (demo, testnet, real) with metrics. */
export function JournalPage() {
  usePageTitle('Журнал сделок');
  const loaded = useLiveQuery<Loaded>(async () => {
    try {
      return { trades: await journalRepo.list() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Не удалось загрузить журнал.' };
    }
  }, []);

  const newButton = (
    <Link to={paths.journalNew()} className={buttonClass()}>
      <Plus className="size-5" aria-hidden="true" />
      Новая сделка
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Журнал сделок" subtitle="Разбор твоей торговли" actions={newButton} />
      {loaded === undefined ? null : 'error' in loaded ? (
        <Card role="alert">{loaded.error}</Card>
      ) : loaded.trades.length === 0 ? (
        <EmptyState
          headingLevel={2}
          art={<Mascot mood="thinking" size={120} />}
          title="Журнал пока пуст"
          description="Записывай каждую сделку на демо, тестнете и реальном счёте — через 20–30 записей станет видно, что работает, а что нет."
          action={newButton}
        />
      ) : (
        <JournalContent trades={loaded.trades} />
      )}
    </div>
  );
}

/** Filters, KPIs, the list and breakdowns of a non-empty journal. */
function JournalContent({ trades }: { trades: JournalTrade[] }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountFilter>('all');
  const [setup, setSetup] = useState('');
  const [result, setResult] = useState<ResultFilter>('all');
  const setups = [...new Set(trades.map((t) => t.setup).filter(Boolean))].sort();
  const shown = trades.filter((t) => matches(t, account, setup, result));
  const metrics = journalMetrics(shown);
  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Счёт"
          value={account}
          options={[
            { value: 'all', label: 'Все' },
            ...ACCOUNTS.map((a) => ({ value: a, label: ACCOUNT_LABEL[a] })),
          ]}
          onChange={setAccount}
        />
        <Segmented
          label="Результат"
          value={result}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'win', label: 'Плюс' },
            { value: 'loss', label: 'Минус' },
            { value: 'open', label: 'Открытые' },
          ]}
          onChange={setResult}
        />
        {setups.length > 0 && (
          <Field label="Сетап">
            {({ id }) => (
              <Select
                id={id}
                value={setup}
                onValueChange={setSetup}
                options={[
                  { value: '', label: 'Все сетапы' },
                  ...setups.map((s) => ({ value: s, label: s })),
                ]}
              />
            )}
          </Field>
        )}
      </div>
      <JournalKpis metrics={metrics} />
      {shown.length === 0 ? (
        <p className="text-text-muted">Под фильтр не попала ни одна сделка.</p>
      ) : (
        <TradeList trades={shown} onOpen={(id) => navigate(paths.journalEntry(id))} />
      )}
      <JournalBreakdowns trades={shown} />
    </>
  );
}

function ResultCell({ t }: { t: JournalTrade }) {
  if (t.pnl === undefined) return <span className="text-text-muted">открыта</span>;
  return (
    <span className={cn('font-bold tabular-nums', t.pnl > 0 ? 'text-bull' : 'text-bear')}>
      {formatR(t.r)} · {formatUsd(t.pnl)}
    </span>
  );
}

function SideBadge({ side }: { side: JournalTrade['side'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-extrabold',
        side === 'long' ? 'bg-bull-soft text-bull' : 'bg-bear-soft text-bear',
      )}
    >
      {side === 'long' ? 'Long' : 'Short'}
    </span>
  );
}

/** Table on desktop, cards on phones. */
function TradeList({ trades, onOpen }: { trades: JournalTrade[]; onOpen: (id: number) => void }) {
  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="py-2 font-bold">Дата</th>
            <th className="font-bold">Инструмент</th>
            <th className="font-bold">Сторона</th>
            <th className="font-bold">Сетап</th>
            <th className="font-bold">По плану</th>
            <th className="text-right font-bold">Результат</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className="cursor-pointer border-t-2 border-border hover:bg-surface-2"
              onClick={() => t.id !== undefined && onOpen(t.id)}
            >
              <td className="py-2">
                <Link to={paths.journalEntry(t.id ?? '')} className="font-bold text-info">
                  {dateFormat.format(t.openedAt)}
                </Link>
              </td>
              <td>
                {t.symbol} · {ACCOUNT_LABEL[t.account]}
              </td>
              <td>
                <SideBadge side={t.side} />
              </td>
              <td>{t.setup || '—'}</td>
              <td>{t.followedPlan ? 'да' : 'нет'}</td>
              <td className="text-right">
                <ResultCell t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col gap-2 md:hidden">
        {trades.map((t) => (
          <li key={t.id}>
            <Link
              to={paths.journalEntry(t.id ?? '')}
              className="flex flex-col gap-1 rounded-2xl border-2 border-border bg-surface p-3"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {t.symbol} <SideBadge side={t.side} />
                </span>
                <ResultCell t={t} />
              </span>
              <span className="text-sm text-text-muted">
                {dateFormat.format(t.openedAt)} · {ACCOUNT_LABEL[t.account]} · {t.setup || '—'}
                {t.followedPlan ? '' : ' · не по плану'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
