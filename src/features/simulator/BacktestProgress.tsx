import { Link } from 'react-router';
import { useDbQuery } from '@/db/useDbQuery';
import { FlaskConical, Play } from 'lucide-react';
import { paths } from '@/app/paths';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { buttonClass } from '@/components/ui/styles';
import { getStrategy } from '@/content/strategies';
import { simRepo } from '@/db/simRepo';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';

/**
 * Lesson block (m11-l04): progress of the manual backtest (trades saved with this strategy tag)
 * and a button that opens the simulator in backtest mode (`<BacktestProgress strategy="tps"/>`).
 */
export function BacktestProgress({ strategy = 'tps' }: { strategy?: string }) {
  const rules = getStrategy(strategy);
  // null while loading or when the database is unavailable: the button still works.
  const count = useDbQuery(
    () =>
      simRepo
        .list({ strategyTag: strategy })
        .then((rows) => rows.length)
        .catch(() => null),
    [strategy],
  );
  if (!rules) return <p role="alert">Неизвестная стратегия: {strategy}</p>;
  const target = rules.targetTrades;
  const done = count ?? 0;
  return (
    <aside
      aria-label={`Бэктест ${rules.title}`}
      className="my-6 flex flex-col gap-3 rounded-3xl border-2 border-epic/50 bg-epic/10 p-5"
    >
      <p className="flex items-center gap-2 font-extrabold text-epic">
        <FlaskConical className="size-6" aria-hidden="true" />
        Бэктест: {rules.title}
      </p>
      <p className="flex justify-between text-sm font-bold">
        <span>Сделок в бэктесте</span>
        <span className="tabular-nums">{count === undefined ? '…' : `${done}/${target}`}</span>
      </p>
      <ProgressBar
        value={done / target}
        tone="epic"
        label="Сделок в бэктесте"
        valueText={count === undefined ? '…' : `${done}/${target}`}
      />
      <p className="text-sm text-text-muted">
        {done >= target
          ? 'Минимальная выборка набрана. Больше сделок — надёжнее выводы: следующая цель — 100.'
          : `До первых выводов — ${target - done} ${plural(target - done, ['сделка', 'сделки', 'сделок'])}. Учитываются сделки в режиме бэктеста тренажёра.`}
      </p>
      <Link
        to={`${paths.simulator()}?backtest=${strategy}`}
        className={cn(buttonClass(), 'self-start')}
      >
        <Play className="size-5" aria-hidden="true" />
        {done > 0 ? 'Продолжить бэктест' : 'Начать бэктест'}
      </Link>
    </aside>
  );
}
