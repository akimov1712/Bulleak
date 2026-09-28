import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { NotebookPen, Radar } from 'lucide-react';
import { paths } from '@/app/paths';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { buttonClass } from '@/components/ui/styles';
import { journalRepo } from '@/db/journalRepo';
import { formatPct, plural } from '@/lib/format';
import { FORWARD_TARGET_TRADES, forwardComparison } from '@/lib/journal/forward';

/**
 * Lesson block (m11-l06): forward-test progress — closed demo/testnet trades in the journal
 * (N/30) and the share of trades made by the plan (`<ForwardTestProgress/>`).
 */
export function ForwardTestProgress() {
  const forward = useLiveQuery(
    () =>
      journalRepo
        .list()
        .then((journal) => forwardComparison([], journal).forward)
        .catch(() => null),
    [],
  );
  const done = forward?.count ?? 0;
  const target = FORWARD_TARGET_TRADES;
  return (
    <aside
      aria-label="Форвард-тест"
      className="my-6 flex flex-col gap-3 rounded-3xl border-2 border-info/50 bg-info/10 p-5"
    >
      <p className="flex items-center gap-2 font-extrabold text-info">
        <Radar className="size-6" aria-hidden="true" />
        Форвард-тест: демо и тестнет
      </p>
      <p className="flex justify-between text-sm font-bold">
        <span>Закрытых сделок в журнале</span>
        <span className="tabular-nums">{forward === undefined ? '…' : `${done}/${target}`}</span>
      </p>
      <ProgressBar value={done / target} tone="info" label="Сделок форвард-теста" />
      <p className="text-sm text-text-muted">
        {done === 0
          ? 'Учитываются закрытые сделки журнала со счётом «Демо» или «Тестнет».'
          : `По плану: ${formatPct(forward?.followedPlanShare ?? null, 0)} сделок. ${
              done >= target
                ? 'Выборка набрана — сравни форвард с бэктестом на странице статистики.'
                : `До выборки — ${target - done} ${plural(target - done, ['сделка', 'сделки', 'сделок'])}.`
            }`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to={paths.journalNew()} className={buttonClass()}>
          <NotebookPen className="size-5" aria-hidden="true" />
          Записать сделку
        </Link>
        <Link to={paths.stats()} className={buttonClass({ variant: 'secondary' })}>
          Сравнить с бэктестом
        </Link>
      </div>
    </aside>
  );
}
