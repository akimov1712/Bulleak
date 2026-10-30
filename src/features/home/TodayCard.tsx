import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { levelFromXp } from '@/lib/gamification/levels';
import { effectiveStreak } from '@/lib/gamification/streak';
import { WeekStreak } from '@/features/gamification/WeekStreak';
import { cardClass } from '@/components/ui/styles';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { useToday } from '@/hooks/useToday';

/** "Today" column: daily goal ring, this week's streak and level progress. */
export function TodayCard({ className }: { className?: string }) {
  const today = useToday();
  const goal = useSettings((s) => s.dailyGoalXp);
  const todayXp = useProgress((s) => s.activity[today]?.xp ?? 0);
  const streak = useProgress((s) => s.streak);
  const xp = useProgress((s) => s.xp);
  const { value: streakValue, atRisk } = effectiveStreak(streak, today);
  const level = levelFromXp(xp);
  const goalDone = todayXp >= goal;

  return (
    <section
      aria-label="Сегодня"
      className={cn(
        cardClass({ padding: 'none' }),
        'flex flex-col divide-y divide-border',
        className,
      )}
    >
      <div className="flex items-center gap-4 p-5">
        <ProgressRing label="Цель дня" value={todayXp / goal} size={76} thickness={8} tone="xp">
          <span className="font-mono text-sm font-semibold">{Math.min(todayXp, goal)}</span>
        </ProgressRing>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-semibold">Цель дня</h2>
          <p className="font-mono text-sm tabular-nums">
            {Math.min(todayXp, goal)}
            <span className="text-text-muted"> / {goal} XP</span>
          </p>
          <p className="text-sm text-text-muted">
            {goalDone ? 'Выполнена — отлично!' : `Осталось ${goal - todayXp} XP`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Flame
              className={cn(
                'size-5',
                streak.lastActiveDay === today ? 'fill-xp text-xp' : 'text-text-muted',
              )}
              aria-hidden="true"
            />
            {streakValue} {plural(streakValue, ['день', 'дня', 'дней'])} подряд
          </h3>
          <span
            className="flex items-center gap-1 font-mono text-sm text-info"
            title="Заморозки серии"
          >
            <Snowflake className="size-4" aria-hidden="true" />
            {streak.freezes}
          </span>
        </div>
        <WeekStreak size="sm" />
        {atRisk && streak.lastActiveDay !== today && (
          <p className="text-sm font-semibold text-warn">
            Позанимайся сегодня, чтобы не потерять серию!
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">
            Уровень {level.level} · {level.rank}
          </h3>
          <span className="shrink-0 font-mono text-xs text-text-muted">
            {level.isMax ? 'макс.' : `ещё ${level.toNext} XP`}
          </span>
        </div>
        <ProgressBar label="Прогресс уровня" value={level.progress} tone="epic" size="sm" />
      </div>
    </section>
  );
}
