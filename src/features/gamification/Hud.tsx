import { useEffect, useState } from 'react';
import { Flame, Snowflake, Zap } from 'lucide-react';
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

/*
 * Learner progress in the top bar: streak and XP chips with explanations in popovers,
 * and `ProfileSummary` for the profile menu.
 */

type Side = 'bottom' | 'bottom-end';

function useStreakState() {
  const streak = useProgress((s) => s.streak);
  const today = useToday();
  const { value, atRisk } = effectiveStreak(streak, today);
  return { streak, value, atRisk, activeToday: streak.lastActiveDay === today };
}

function useGoalState() {
  const xp = useProgress((s) => s.xp);
  const today = useToday();
  const todayXp = useProgress((s) => s.activity[today]?.xp ?? 0);
  const goal = useSettings((s) => s.dailyGoalXp);
  return { xp, todayXp, goal };
}

const streakLabel = (value: number) =>
  `Серия: ${value} ${plural(value, ['день', 'дня', 'дней'])} подряд`;

function StreakDetails() {
  const { streak, value, atRisk, activeToday } = useStreakState();
  return (
    <div className="flex w-64 flex-col gap-3">
      <p className="font-semibold">
        {value > 0
          ? `${value} ${plural(value, ['день', 'дня', 'дней'])} подряд`
          : 'Начни серию сегодня'}
      </p>
      <WeekStreak size="sm" />
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Snowflake className="size-4 text-info" aria-hidden="true" />
        Заморозки: {streak.freezes} из 2 — спасают серию, если пропустишь день. +1 за каждые 7 дней
        подряд.
      </p>
      {atRisk && !activeToday && (
        <p className="text-sm font-bold text-warn">Позанимайся сегодня, чтобы не потерять серию!</p>
      )}
      <p className="text-xs text-text-muted">Рекорд: {streak.longest}</p>
    </div>
  );
}

function GoalDetails() {
  const { xp, todayXp, goal } = useGoalState();
  return (
    <div className="flex w-60 items-center gap-4">
      <ProgressRing label="Цель дня" value={todayXp / goal} size={72} thickness={8} tone="xp">
        <span className="font-mono text-xs font-semibold">
          {Math.min(todayXp, goal)}/{goal}
        </span>
      </ProgressRing>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Цель дня</p>
        <p className="text-sm text-text-muted">
          {todayXp >= goal ? 'Выполнена — отлично!' : `Ещё ${goal - todayXp} XP до цели`}
        </p>
        <p className="text-xs text-text-muted">Всего опыта: {formatNumber(xp, 0)} XP</p>
      </div>
    </div>
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

function XpFlash() {
  const flash = useXpFlash();
  const reduced = useReducedMotion();
  if (!flash) return null;
  return (
    <span
      key={flash.id}
      aria-hidden="true"
      // Fading decoration: excluded from contrast checks (e2e/a11y.spec.ts).
      data-transient=""
      className={cn(
        'pointer-events-none absolute -top-1 right-1 rounded-full bg-xp px-1.5 font-mono text-xs font-semibold text-on-xp',
        !reduced && 'animate-[xp-fly_900ms_ease-out_forwards]',
      )}
    >
      +{flash.amount}
    </span>
  );
}

function FlameBadge({ active, atRisk }: { active: boolean; atRisk: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full',
        active ? 'bg-linear-to-b from-xp to-mod-orange' : 'bg-surface-2',
      )}
    >
      <Flame
        className={cn(
          'size-3.5',
          active ? 'fill-white text-white' : atRisk ? 'text-warn' : 'text-text-muted',
        )}
      />
    </span>
  );
}

/** Decorative ring around the XP icon: today's progress to the daily goal. */
function GoalRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <span className="relative grid size-6 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-border" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="stroke-xp transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <Zap className="size-3 fill-xp text-xp" />
    </span>
  );
}

/** Hexagon badge with the level number. */
export function LevelBadge({ level, size = 'md' }: { level: number; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center',
        size === 'lg' ? 'size-11' : 'size-7',
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0">
        <path
          d="M18 2.5 31.5 10.3v15.4L18 33.5 4.5 25.7V10.3Z"
          strokeLinejoin="round"
          strokeWidth="3"
          className="fill-epic stroke-epic"
        />
        <path
          d="M18 7 27.5 12.5v11L18 29 8.5 23.5v-11Z"
          fill="none"
          strokeWidth="1.2"
          className="stroke-on-epic/30"
        />
      </svg>
      <span
        className={cn(
          'relative font-mono font-bold text-on-epic',
          size === 'lg' ? 'text-base' : 'text-xs',
        )}
      >
        {level}
      </span>
    </span>
  );
}

/* ---------- Top bar ---------- */

const chipClass =
  'relative flex h-9 items-center gap-1.5 rounded-(--radius-btn) px-2 font-mono text-sm font-semibold tabular-nums text-text transition-colors hover:bg-surface-2';

export function StreakChip({ side = 'bottom' }: { side?: Side }) {
  const { value, atRisk, activeToday } = useStreakState();
  return (
    <Popover placement={side} content={<StreakDetails />}>
      <button type="button" className={chipClass} aria-label={streakLabel(value)}>
        <FlameBadge active={activeToday} atRisk={atRisk} />
        {value}
      </button>
    </Popover>
  );
}

export function XpChip({ side = 'bottom' }: { side?: Side }) {
  const { xp, todayXp, goal } = useGoalState();
  return (
    <Popover placement={side} content={<GoalDetails />}>
      <button type="button" className={chipClass} aria-label={`Опыт: ${xp} XP`}>
        <GoalRing value={todayXp / goal} />
        {formatNumber(xp, 0)}
        <XpFlash />
      </button>
    </Popover>
  );
}

/** Streak and XP (with today's goal ring) in the top bar. */
export function Hud({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)} aria-label="Твой прогресс" role="group">
      <StreakChip />
      <XpChip />
    </div>
  );
}

/** Head of the profile menu: name, level, progress to the next level. */
export function ProfileSummary() {
  const name = useProgress((s) => s.profile.name);
  const info = levelFromXp(useProgress((s) => s.xp));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <LevelBadge level={info.level} size="lg" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{name || 'Трейдер'}</span>
          <span className="truncate text-xs text-text-muted">
            Уровень {info.level} · {info.rank}
          </span>
        </div>
      </div>
      <ProgressBar label="До следующего уровня" value={info.progress} tone="epic" size="sm" />
      <p className="text-xs text-text-muted">
        {info.isMax ? 'Максимальный уровень!' : `Ещё ${info.toNext} XP до уровня ${info.level + 1}`}
      </p>
    </div>
  );
}
