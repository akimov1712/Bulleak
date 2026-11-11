import { useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Skeleton';
import { Mascot } from '@/components/mascot/Mascot';
import { useDbQuery } from '@/db/useDbQuery';
import { simRepo } from '@/db/simRepo';
import { journalRepo } from '@/db/journalRepo';
import {
  disciplineChecks,
  journalDisciplineTrades,
  simDisciplineTrades,
} from '@/lib/discipline/rules';
import {
  DISCIPLINE_MIN_TRADES,
  DISCIPLINE_WINDOW,
  disciplineSummary,
} from '@/lib/discipline/disciplineIndex';
import { formatNumber, plural } from '@/lib/format';
import { paths } from '@/app/paths';
import { EquityCurves } from '../calculators/EquityCurves';
import { BehaviourCard } from './BehaviourCard';
import { isClosed } from '@/lib/journal/metrics';
import type { HeldTrade } from '@/lib/stats/behaviour';

type Source = 'sim' | 'journal';

const SOURCES: { value: Source; label: string }[] = [
  { value: 'sim', label: 'Тренажёр' },
  { value: 'journal', label: 'Журнал' },
];

/** «Дисциплина» tab: how often the course rules are kept, not how much was earned. */
export function DisciplineStats() {
  const [source, setSource] = useState<Source>('sim');
  const loaded = useDbQuery(
    () =>
      Promise.all([simRepo.list(), journalRepo.list()]).then(
        ([sim, journal]) => ({ sim, journal }),
        (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
      ),
    [],
  );
  if (loaded === undefined) return null;
  if (loaded instanceof Error) return <Card role="alert">{loaded.message}</Card>;

  const trades =
    source === 'sim' ? simDisciplineTrades(loaded.sim) : journalDisciplineTrades(loaded.journal);
  const summary = disciplineSummary(disciplineChecks(trades));
  const series = summary.series.filter((v): v is number => v !== null);
  const held: HeldTrade[] =
    source === 'sim'
      ? loaded.sim
          .filter((t) => !t.deleted && !t.strategyTag)
          .map((t) => ({ at: t.at, held: t.exitIndex - t.startIndex, r: t.r, pnl: t.pnl }))
      : loaded.journal
          .filter(isClosed)
          .filter((t) => !t.deleted)
          .map((t) => ({ at: t.openedAt, held: t.closedAt - t.openedAt, r: t.r, pnl: t.pnl }));
  const revenge = summary.rules.find((r) => r.rule === 'revenge') ?? { broken: 0, checked: 0 };

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Чьи сделки"
        hideLabel
        value={source}
        options={SOURCES}
        onChange={setSource}
      />
      {summary.trades === 0 ? (
        <EmptyState
          art={<Mascot mood="thinking" size={120} />}
          title={source === 'sim' ? 'Сделок в тренажёре пока нет' : 'Закрытых сделок в журнале нет'}
          description="Дисциплина считается по правилам курса: риск, R:R, дневной лимит, сделки из мести, стоп и план."
          action={
            <Link
              to={source === 'sim' ? paths.simulator() : paths.journalNew()}
              className="font-bold text-info underline"
            >
              {source === 'sim' ? 'В тренажёр' : 'Записать сделку'}
            </Link>
          }
        />
      ) : (
        <>
          <Card className="flex flex-col gap-2" aria-label="Индекс дисциплины">
            <p className="text-sm text-text-muted">
              Индекс дисциплины — доля соблюдённых правил в последних {DISCIPLINE_WINDOW} сделках
            </p>
            <p className="font-mono text-4xl font-semibold tabular-nums">
              {summary.fewTrades || summary.index === null
                ? 'мало данных'
                : `${formatNumber(summary.index, 0)} / 100`}
            </p>
            <p className="text-sm text-text-muted">
              {summary.trades} {plural(summary.trades, ['сделка', 'сделки', 'сделок'])}
              {summary.fewTrades &&
                ` · индекс появится с ${DISCIPLINE_MIN_TRADES} ${plural(DISCIPLINE_MIN_TRADES, ['сделки', 'сделок', 'сделок'])}`}
            </p>
            {!summary.fewTrades && series.length > 1 && (
              <EquityCurves
                curves={[series]}
                baseline={100}
                label="Индекс дисциплины после каждой сделки"
                height={140}
              />
            )}
          </Card>
          {summary.rules.length > 0 && (
            <Card className="flex flex-col gap-3" aria-label="Правила">
              <h2 className="font-semibold">Правила в последних {DISCIPLINE_WINDOW} сделках</h2>
              <ul className="flex flex-col gap-2">
                {summary.rules.map((r) => (
                  <li key={r.rule} className="flex items-baseline justify-between gap-3">
                    <span>{r.title}</span>
                    <span
                      className={
                        r.broken > 0
                          ? 'font-mono font-bold text-bear tabular-nums'
                          : 'font-mono font-bold text-bull tabular-nums'
                      }
                    >
                      {r.broken > 0
                        ? `нарушено ${r.broken} из ${r.checked}`
                        : `соблюдено ${r.checked} из ${r.checked}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-text-muted">
                Правило проверяется только там, где оно применимо: дневной лимит и сделка из мести —
                после убытка, риск в процентах — когда известен баланс.
              </p>
            </Card>
          )}
          <BehaviourCard trades={held} revenge={revenge} />
        </>
      )}
    </div>
  );
}
