import { Card } from '@/components/ui/Card';
import { formatNumber, formatR } from '@/lib/format';
import { divergences, type Divergence, type SourceMetrics } from '@/lib/stats/compare';

const NOTE: Record<Divergence, string> = {
  'discipline-lower-in-journal':
    'В тренажёре правила соблюдаются заметно чаще, чем в журнале. На демо и реальном счёте мешают эмоции — стоит перечитать торговый план перед сделкой.',
  'discipline-lower-in-sim':
    'В тренажёре дисциплина ниже, чем в журнале: возможно, сделки там делаются «на скорую руку». Тренажёр полезен, только если торговать в нём по тем же правилам.',
  'results-differ':
    'Результат в тренажёре и в журнале различается сильнее, чем объясняет случайность. Сравни, по одним ли правилам ты входишь в сделки там и там.',
};

function Column({ title, m }: { title: string; m: SourceMetrics }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm">Сделок: {m.trades}</p>
      <p className="text-sm">
        Дисциплина:{' '}
        {m.discipline === null ? 'мало данных' : `${formatNumber(m.discipline, 0)} / 100`}
      </p>
      <p className="text-sm">
        Матожидание:{' '}
        {m.expectancy
          ? `${formatR(m.expectancy.mean)} (${formatR(m.expectancy.low)}…${formatR(m.expectancy.high)})`
          : '—'}
      </p>
      <p className="text-sm">
        Профит-фактор: {m.profitFactor === null ? '—' : formatNumber(m.profitFactor, 2)}
      </p>
    </div>
  );
}

/** The same metrics for the simulator and the journal, with notable gaps explained. */
export function SimVsJournalCard({ sim, journal }: { sim: SourceMetrics; journal: SourceMetrics }) {
  if (sim.trades === 0 || journal.trades === 0) return null;
  const notes = divergences(sim, journal);
  return (
    <Card className="flex flex-col gap-3" aria-label="Тренажёр и журнал">
      <h2 className="font-semibold">Тренажёр и журнал</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Column title="Тренажёр" m={sim} />
        <Column title="Журнал" m={journal} />
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-text-muted">Заметных расхождений нет.</p>
      ) : (
        notes.map((n) => (
          <p key={n} role="status" className="text-sm font-semibold text-warn">
            {NOTE[n]}
          </p>
        ))
      )}
    </Card>
  );
}
