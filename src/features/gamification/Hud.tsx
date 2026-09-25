import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, Snowflake, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber, plural } from '@/lib/format';
import { levelFromXp } from '@/lib/gamification/levels';
import { effectiveStreak } from '@/lib/gamification/streak';
import { WeekStreak } from './WeekStreak';
import { Popover } from '@/components/ui/Popover';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';
import { useSettings } from '@/store/settingsStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useToday } from '@/hooks/useToday';

const chipClass =
  'flex items-center gap-1 rounded-full px-1.5 py-1 font-extrabold text-text hover:bg-surface-2 sm:px-2';

export function StreakChip() {
  const streak = useProgress((s) => s.streak);
  const today = useToday();
  const { value, atRisk } = effectiveStreak(streak, today);
  const activeToday = streak.lastActiveDay === today;

  return (
    <Popover
      placement="bottom"
      content={
        <div className="flex w-64 flex-col gap-3">
          <p className="font-extrabold">
            {value > 0
              ? `${value} ${plural(value, ['день', 'дня', 'дней'])} подряд`
              : 'Начни серию сегодня'}
          </p>
          <WeekStreak size="sm" />
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Snowflake className="size-4 text-info" aria-hidden="true" />
            Заморозки: {streak.freezes} из 2 — спасают серию, если пропустишь день. +1 за каждые 7
            дней подряд.
          </p>
          {atRisk && !activeToday && (
            <p className="text-sm font-bold text-warn">
              Позанимайся сегодня, чтобы не потерять серию!
            </p>
          )}
          <p className="text-xs text-text-muted">Рекорд: {streak.longest}</p>
        </div>
      }
    >
      <button
        type="button"
        className={chipClass}
        aria-label={`Серия: ${value} ${plural(value, ['день', 'дня', 'дней'])} подряд`}
      >
        <Flame
          className={cn('size-5', activeToday ? 'fill-xp text-xp-shade' : 'text-text-muted')}
          aria-hidden="true"
        />
        <span className="font-mono tabular-nums">{value}</span>
      </button>
    </Popover>
  );
}

/** "+N" that floats up after XP is earned in this tab (not on rehydrate or import). */
function useXpFlash(): { amount: number; id: number } | null {
  const gain = useUi((s) => s.lastXpGain);
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  useEffect(() => {
    if (!gain) return;
    const timer = window.setTimeout(() => setHiddenId(gain.id), 1400);
    return () => window.clearTimeout(timer);
  }, [gain]);
  return gain && gain.id !== hiddenId ? gain : null;
}

export function XpChip() {
  const xp = useProgress((s) => s.xp);
  const today = useToday();
  const todayXp = useProgress((s) => s.activity[today]?.xp ?? 0);
  const goal = useSettings((s) => s.dailyGoalXp);
  const flash = useXpFlash();
  const reduced = useReducedMotion();

  return (
    <Popover
      placement="bottom"
      content={
        <div className="flex w-60 items-center gap-4">
          <ProgressRing label="Цель дня" value={todayXp / goal} size={72} thickness={8} tone="xp">
            <span className="font-mono text-xs font-extrabold">
              {Math.min(todayXp, goal)}/{goal}
            </span>
          </ProgressRing>
          <div className="flex flex-col gap-1">
            <p className="font-extrabold">Цель дня</p>
            <p className="text-sm text-text-muted">
              {todayXp >= goal ? 'Выполнена — отлично!' : `Ещё ${goal - todayXp} XP до цели`}
            </p>
            <p className="text-xs text-text-muted">Всего опыта: {formatNumber(xp, 0)} XP</p>
          </div>
        </div>
      }
    >
      <button type="button" className={cn(chipClass, 'relative')} aria-label={`Опыт: ${xp} XP`}>
        <Zap className="size-5 fill-xp text-xp-shade" aria-hidden="true" />
        <span className="font-mono tabular-nums">{formatNumber(xp, 0)}</span>
        <AnimatePresence>
          {flash && (
            <motion.span
              key={flash.id}
              aria-hidden="true"
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: -22 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute -top-1 right-0 rounded-full bg-xp px-1.5 font-mono text-xs font-extrabold text-on-xp"
            >
              +{flash.amount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Popover>
  );
}

export function LevelChip() {
  const xp = useProgress((s) => s.xp);
  const info = levelFromXp(xp);
  return (
    <Popover
      placement="bottom"
      content={
        <div className="flex w-60 flex-col gap-2">
          <p className="font-extrabold">
            Уровень {info.level} · {info.rank}
          </p>
          <ProgressBar label="До следующего уровня" value={info.progress} tone="epic" />
          <p className="text-sm text-text-muted">
            {info.isMax
              ? 'Максимальный уровень!'
              : `Ещё ${info.toNext} XP до уровня ${info.level + 1}`}
          </p>
        </div>
      }
    >
      <button
        type="button"
        className={chipClass}
        aria-label={`Уровень ${info.level}, ${info.rank}`}
      >
        <Star className="size-5 fill-epic text-epic" aria-hidden="true" />
        <span className="font-mono tabular-nums">{info.level}</span>
      </button>
    </Popover>
  );
}

export function Hud() {
  return (
    <div className="flex items-center gap-0.5 sm:gap-2" aria-label="Твой прогресс" role="group">
      <StreakChip />
      <XpChip />
      <LevelChip />
    </div>
  );
}
