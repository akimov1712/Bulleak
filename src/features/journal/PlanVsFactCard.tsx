import { Card } from '@/components/ui/Card';
import { EXIT_LABEL, summarizePlanFact, type ExitKind } from '@/lib/journal/planVsFact';
import type { JournalTrade } from '@/types/trading';

const ORDER: ExitKind[] = ['target', 'stop', 'early-win', 'early-loss', 'beyond-stop'];
const r = (v: number) => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}R`;

/** Journal: how closed trades ended compared with their planned stop and take (T-2505). */
export function PlanVsFactCard({ trades }: { trades: readonly JournalTrade[] }) {
  const s = summarizePlanFact(trades);
  if (s.count === 0) return null;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">План и факт</h2>
      <p className="text-sm text-text-muted">
        Как закрылись сделки относительно своих стопа и тейка. По плану (у стопа или тейка):{' '}
        <span className="font-bold text-text">
          {Math.round((s.byPlanShare ?? 0) * 100)} % из {s.count}
        </span>
        .
      </p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {ORDER.map((kind) => (
          <li key={kind} className="flex justify-between gap-2 border-b border-border py-1">
            <span>{EXIT_LABEL[kind]}</span>
            <span className="font-bold tabular-nums">{s.byKind[kind]}</span>
          </li>
        ))}
      </ul>
      {s.leftOnTableR > 0.05 && (
        <p className="text-sm">
          Ранние выходы в плюсе оставили до тейка {r(s.leftOnTableR)}. Если это частая привычка,
          проверь в журнале, что заставляет закрывать раньше: страх или правило плана.
        </p>
      )}
      {s.extraLossR > 0.05 && (
        <p className="text-sm text-bear">
          Убытки сверх стопа: {r(s.extraLossR)}. Это проскальзывание или перенос стопа — второе
          нарушает правила.
        </p>
      )}
    </Card>
  );
}
