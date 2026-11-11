import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, Printer } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { skillIndex } from '@/content/skills';
import { useDbQuery } from '@/db/useDbQuery';
import { simRepo } from '@/db/simRepo';
import { journalRepo } from '@/db/journalRepo';
import { AdviceCard } from '@/features/learner/AdviceCard';
import { answerEvents } from '@/lib/learner/events';
import { journalCsv, simTradesCsv } from '@/lib/io/csv';
import { weeklyReport } from '@/lib/stats/weekly';
import { toDateKey } from '@/lib/date';
import { formatNumber, formatPct, plural } from '@/lib/format';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';
import { downloadFile } from '@/features/io/download';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const download = (name: string, text: string) =>
  downloadFile(name, new Blob([text], { type: 'text/csv;charset=utf-8' }));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-mono font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** /stats/week — the last 7 days: learning, practice discipline, skills that moved, advice. */
export function WeeklyReportPage() {
  usePageTitle('Отчёт за неделю');
  const progress = useProgress();
  const [now] = useState(() => Date.now());
  const loaded = useDbQuery(
    () =>
      Promise.all([simRepo.list(), journalRepo.list()]).then(
        ([sim, journal]) => ({ sim, journal }),
        () => ({ sim: [], journal: [] }),
      ),
    [],
  );
  const report = useMemo(
    () =>
      loaded &&
      weeklyReport({
        progress,
        answers: answerEvents(progress.quizAttempts, skillIndex.skillsOfTags),
        sim: loaded.sim,
        journal: loaded.journal,
        now,
      }),
    [loaded, progress, now],
  );
  if (!loaded || !report) return null;
  const { learning, practice } = report;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Отчёт за неделю"
        subtitle={`${dateFormat.format(report.from)} — ${dateFormat.format(report.to)}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="secondary"
              leftIcon={<Printer className="size-5" aria-hidden="true" />}
              onClick={() => window.print()}
            >
              Сохранить в PDF
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2" aria-label="Учёба">
          <h2 className="font-semibold">Учёба</h2>
          <dl className="flex flex-col gap-1">
            <Row label="Опыт" value={`${learning.xp} XP`} />
            <Row label="Дней с занятиями" value={`${learning.activeDays} из 7`} />
            <Row label="Уроков пройдено" value={String(learning.lessonsCompleted)} />
            <Row
              label="Ответов в тестах"
              value={
                learning.answers === 0
                  ? '0'
                  : `${learning.answers} · верно ${formatPct(learning.correct / learning.answers, 0)}`
              }
            />
          </dl>
        </Card>
        <Card className="flex flex-col gap-2" aria-label="Практика">
          <h2 className="font-semibold">Практика</h2>
          <dl className="flex flex-col gap-1">
            <Row label="Сделок в тренажёре" value={String(practice.simTrades)} />
            <Row label="Сделок в журнале" value={String(practice.journalTrades)} />
            <Row
              label="Правила соблюдены"
              value={
                practice.discipline === null
                  ? 'нет сделок'
                  : `${formatNumber(practice.discipline, 0)} / 100`
              }
            />
            <Row label="Нарушений" value={String(practice.broken)} />
          </dl>
        </Card>
      </div>
      <Card className="flex flex-col gap-2" aria-label="Навыки за неделю">
        <h2 className="font-semibold">Навыки за неделю</h2>
        {report.skills.length === 0 ? (
          <p className="text-text-muted">Заметных изменений нет.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {report.skills.map((s) => (
              <li key={s.skill} className="flex justify-between gap-3">
                <span>{skillIndex.getSkill(s.skill)?.title ?? s.skill}</span>
                <span
                  className={s.after > s.before ? 'font-bold text-bull' : 'font-bold text-bear'}
                >
                  {s.after > s.before ? 'лучше' : 'хуже'} ({formatPct(s.before, 0)} →{' '}
                  {formatPct(s.after, 0)})
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to={paths.skills()}
          className="text-sm font-bold text-info hover:underline print:hidden"
        >
          Все навыки
        </Link>
      </Card>
      <AdviceCard />
      <Card className="flex flex-col gap-2 print:hidden" aria-label="Экспорт">
        <h2 className="font-semibold">Экспорт сделок</h2>
        <p className="text-sm text-text-muted">
          CSV открывается в Excel и Google Таблицах: можно посчитать что-то своё.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            leftIcon={<Download className="size-5" aria-hidden="true" />}
            onClick={() =>
              download(`bulleak-simulator-${toDateKey(now)}.csv`, simTradesCsv(loaded.sim))
            }
          >
            Тренажёр · {loaded.sim.length}{' '}
            {plural(loaded.sim.length, ['сделка', 'сделки', 'сделок'])}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Download className="size-5" aria-hidden="true" />}
            onClick={() =>
              download(`bulleak-journal-${toDateKey(now)}.csv`, journalCsv(loaded.journal))
            }
          >
            Журнал · {loaded.journal.length}{' '}
            {plural(loaded.journal.length, ['запись', 'записи', 'записей'])}
          </Button>
        </div>
      </Card>
      <p className="text-sm text-text-muted">
        Отчёт про учёбу и дисциплину, а не про доход: курс не обещает прибыль и не даёт торговых
        рекомендаций.
      </p>
    </div>
  );
}
