import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, XCircle } from 'lucide-react';
import { paths } from '@/app/paths';
import { Card } from '@/components/ui/Card';
import { journalRepo } from '@/db/journalRepo';
import { simRepo } from '@/db/simRepo';
import { formatNumber, formatPct, formatR } from '@/lib/format';
import {
  readiness,
  READINESS_THRESHOLDS as T,
  type Readiness,
  type ReadinessId,
} from '@/lib/progress/readiness';
import { useProgress } from '@/store/progressStore';

interface ItemCopy {
  title: string;
  detail: (r: Readiness) => string;
  fix: { label: string; to: string };
}

const COPY: Record<ReadinessId, ItemCopy> = {
  exams: {
    title: 'Экзамены модулей 0–11 сданы',
    detail: (r) => `Сдано ${r.examsPassed} из ${r.examsTotal}.`,
    fix: { label: 'К карте курса', to: paths.path() },
  },
  backtest: {
    title: `Бэктест: не меньше ${T.backtestTrades} сделок, матожидание от +${formatNumber(T.backtestExpectancyR, 1)}R`,
    detail: (r) => `Сделок: ${r.backtest.count}, матожидание ${formatR(r.backtest.expectancyR)}.`,
    fix: { label: 'Продолжить бэктест', to: `${paths.simulator()}?backtest=tps` },
  },
  forward: {
    title: `Форвард-тест: не меньше ${T.forwardTrades} сделок на демо или тестнете, матожидание выше нуля, ${formatPct(T.followedPlanShare, 0)} сделок по плану`,
    detail: (r) =>
      `Сделок: ${r.forward.count}, матожидание ${formatR(r.forward.expectancyR)}, по плану ${formatPct(r.forward.followedPlanShare, 0)}.`,
    fix: { label: 'Записать сделку', to: paths.journalNew() },
  },
  plan: {
    title: 'Торговый план сохранён, все разделы заполнены',
    detail: () => 'Девять разделов: от целей до правил изменения плана.',
    fix: { label: 'Открыть план', to: paths.plan() },
  },
  strategy: {
    title: 'Своя версия стратегии сохранена',
    detail: () => 'Правила, по которым ты торговал в бэктесте и форвард-тесте.',
    fix: { label: 'Открыть редактор стратегии', to: paths.plan() },
  },
  limits: {
    title: 'Лимиты риска записаны в плане',
    detail: () => 'Риск на сделку, открытый риск, дневной и недельный лимит убытка.',
    fix: { label: 'Открыть план', to: paths.plan() },
  },
};

/**
 * Real-trading readiness (m12-l01): automatic checks from progress, the simulator and the
 * journal, each with a «how to fix» link (`<ReadinessChecklist/>`).
 */
export function ReadinessChecklist() {
  const exams = useProgress((s) => s.exams);
  const tradingPlan = useProgress((s) => s.tradingPlan);
  const strategy = useProgress((s) => s.strategy);
  const data = useLiveQuery(
    () =>
      Promise.all([simRepo.list(), journalRepo.list()])
        .then(([simTrades, journal]) => ({ simTrades, journal }))
        .catch(() => ({ simTrades: [], journal: [] })),
    [],
  );
  if (!data) return null;
  const r = readiness({ exams, tradingPlan, strategy, ...data });
  const passed = r.items.filter((i) => i.passed).length;
  return (
    <Card className="my-6 flex flex-col gap-4" aria-label="Проверка готовности">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold">Готовность к реальному счёту</h2>
        <span className="font-bold tabular-nums">
          {passed}/{r.items.length}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {r.items.map((item) => {
          const copy = COPY[item.id];
          return (
            <li key={item.id} className="flex gap-3">
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-bull" aria-label="выполнено" />
              ) : (
                <XCircle className="mt-0.5 size-6 shrink-0 text-bear" aria-label="не выполнено" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">{copy.title}</span>
                <span className="text-sm text-text-muted">{copy.detail(r)}</span>
                {!item.passed && (
                  <Link to={copy.fix.to} className="text-sm font-bold text-info underline">
                    Как исправить: {copy.fix.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={r.ready ? 'font-bold text-bull' : 'text-text-muted'}>
        {r.ready
          ? 'Все автоматические проверки пройдены. Осталось честно ответить на ручные пункты ниже.'
          : 'Пока рано. Это нормально: продлить форвард-тест дешевле, чем учиться на реальных деньгах.'}
      </p>
    </Card>
  );
}
