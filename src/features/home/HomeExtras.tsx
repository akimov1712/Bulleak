import { Link } from 'react-router';
import { BookOpen, Calculator, CandlestickChart, ChevronRight, Save } from 'lucide-react';
import { achievementById } from '@/content/achievements';
import { cardClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import { useProgress } from '@/store/progressStore';

export function RecentAchievements() {
  const unlocked = useProgress((s) => s.achievements);
  const recent = Object.entries(unlocked)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => achievementById.get(id))
    .filter((a) => a !== undefined);

  return (
    <section aria-labelledby="recent-achievements" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="recent-achievements" className="text-xl font-extrabold">
          Достижения
        </h2>
        <Link
          to={paths.achievements()}
          className="flex items-center font-bold text-info hover:underline"
        >
          Все {Object.keys(unlocked).length}/40
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-4 text-text-muted">
          Пока пусто — первое достижение ждёт тебя в первом уроке.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {recent.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-epic/40 bg-epic-soft p-3"
            >
              <span className="text-3xl" aria-hidden="true">
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-extrabold">{a.title}</span>
                <span className="block truncate text-xs text-text-muted">{a.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const QUICK = [
  {
    to: paths.simulator(),
    icon: CandlestickChart,
    title: 'Тренажёр',
    text: 'Сделки на истории Bybit',
  },
  { to: paths.tools(), icon: Calculator, title: 'Калькуляторы', text: 'Риск, позиция, ликвидация' },
  { to: paths.glossary(), icon: BookOpen, title: 'Глоссарий', text: 'Термины трейдинга' },
] as const;

export function QuickLinks() {
  return (
    <nav aria-label="Быстрые ссылки" className="grid gap-3 sm:grid-cols-3">
      {QUICK.map(({ to, icon: Icon, title, text }) => (
        <Link
          key={to}
          to={to}
          className={cardClass({ interactive: true, padding: 'sm' }) + ' flex items-center gap-3'}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-extrabold">{title}</span>
            <span className="block text-sm text-text-muted">{text}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function BackupReminder({ onSnooze }: { onSnooze: () => void }) {
  return (
    <div
      role="note"
      className="flex flex-col gap-3 rounded-2xl border-2 border-info bg-info-soft p-4 sm:flex-row sm:items-center"
    >
      <Save className="size-6 shrink-0 text-info" aria-hidden="true" />
      <p className="flex-1">
        Прогресс хранится только в этом браузере. Сделай резервную копию — это займёт секунду.
      </p>
      <Link to={paths.settings()} className="font-extrabold text-info hover:underline">
        Сделать копию
      </Link>
      <button
        type="button"
        onClick={onSnooze}
        className="font-bold text-text-muted hover:text-text"
      >
        Напомнить позже
      </button>
    </div>
  );
}
