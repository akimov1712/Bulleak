import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { levelFromXp } from '@/lib/gamification/levels';
import { effectiveStreak } from '@/lib/gamification/streak';
import { WeekStreak } from '@/features/gamification/WeekStreak';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { useToday } from '@/hooks/useToday';

/** Daily goal ring, this week's streak and level progress. */
export function TodayCard() {
  const today = useToday();
  const goal = useSettings((s) => s.dailyGoalXp);
  const todayXp = useProgress((s) => s.activity[today]?.xp ?? 0);
  const streak = useProgress((s) => s.streak);
  const xp = useProgress((s) => s.xp);
  const { value: streakValue, atRisk } = effectiveStreak(streak, today);
  const level = levelFromXp(xp);
  const goalDone = todayXp >= goal;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex items-center gap-5">
        <ProgressRing label="Цель дня" value={todayXp / goal} size={104} thickness={12} tone="xp">
          <span className="flex flex-col items-center leading-tight">
            <span className="font-mono text-xl font-extrabold">{Math.min(todayXp, goal)}</span>
            <span className="text-xs font-bold text-text-muted">из {goal} XP</span>
          </span>
        </ProgressRing>
        <div>
          <h2 className="text-lg font-extrabold">Цель дня</h2>
          <p className="text-text-muted">
            {goalDone
              ? 'Выполнена! Можно отдохнуть или сделать ещё.'
              : `Осталось ${goal - todayXp} XP`}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Flame
              className={cn(
                'size-6',
                streak.lastActiveDay === today ? 'fill-xp text-xp-shade' : 'text-text-muted',
              )}
              aria-hidden="true"
            />
            {streakValue} {plural(streakValue, ['день', 'дня', 'дней'])} подряд
          </h2>
          <span
            className="flex items-center gap-1 text-sm font-bold text-info"
            title="Заморозки серии"
          >
            <Snowflake className="size-4" aria-hidden="true" />
            {streak.freezes}
          </span>
        </div>
        <WeekStreak />
        {atRisk && streak.lastActiveDay !== today && (
          <p className="text-sm font-bold text-warn">
            Позанимайся сегодня, чтобы не потерять серию!
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-2 md:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold">
            Уровень {level.level} · {level.rank}
          </h2>
          <span className="font-mono text-sm font-bold text-text-muted">
            {level.isMax ? 'макс.' : `ещё ${level.toNext} XP`}
          </span>
        </div>
        <ProgressBar label="Прогресс уровня" value={level.progress} tone="epic" />
      </Card>
    </div>
  );
}
