import { Link } from 'react-router';
import { CandlestickChart, Play } from 'lucide-react';
import { paths } from '@/app/paths';
import { buttonClass } from '@/components/ui/styles';
import { getScenario } from '@/content/scenarios';
import { cn } from '@/lib/cn';

/** Lesson block: a simulator scenario teaser with a button that opens it (`<SimScenario id>`). */
export function SimScenario({ id }: { id: string }) {
  const scenario = getScenario(id);
  if (!scenario) {
    return <p role="alert">Неизвестный сценарий тренажёра: {id}</p>;
  }
  return (
    <aside
      aria-label={`Сценарий тренажёра: ${scenario.title}`}
      className="my-6 flex flex-col gap-3 rounded-3xl border-2 border-info/50 bg-info/10 p-5"
    >
      <p className="flex items-center gap-2 font-extrabold text-info">
        <CandlestickChart className="size-6" aria-hidden="true" />
        Практика в тренажёре: {scenario.title}
      </p>
      <p>{scenario.task}</p>
      <p className="text-sm text-text-muted">
        Реальная история Bybit, будущие свечи скрыты. Прими решение — и сравни его с учебным.
      </p>
      <Link to={paths.simulator(scenario.id)} className={cn(buttonClass(), 'self-start')}>
        <Play className="size-5" aria-hidden="true" />
        Открыть сценарий
      </Link>
    </aside>
  );
}
