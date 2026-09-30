import { useEffect, useState, type ReactNode } from 'react';
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
 * Learner progress on the dark navigation chrome: `ProgressPanel` in the desktop sidebar,
 * `Hud` in the mobile header. Both open the same explanations in popovers.
 */

type Side = 'bottom' | 'right-start';

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
      <p className="font-extrabold">
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
  );
}

function LevelDetails() {
  const info = levelFromXp(useProgress((s) => s.xp));
  return (
    <div className="flex w-60 flex-col gap-2">
      <p className="font-extrabold">
        Уровень {info.level} · {info.rank}
      </p>
      <ProgressBar label="До следующего уровня" value={info.progress} tone="epic" />
      <p className="text-sm text-text-muted">
        {info.isMax ? 'Максимальный уровень!' : `Ещё ${info.toNext} XP до уровня ${info.level + 1}`}
      </p>
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
        'pointer-events-none absolute -top-1 right-1 rounded-full bg-xp px-1.5 font-mono text-xs font-extrabold text-on-xp',
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
        'grid size-8 shrink-0 place-items-center rounded-full',
        active ? 'bg-linear-to-b from-xp to-mod-orange' : 'bg-ink-3',
      )}
    >
      <Flame
        className={cn(
          'size-[1.1rem]',
          active ? 'fill-white text-white' : atRisk ? 'text-warn' : 'text-on-ink-muted',
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
    <span className="relative grid size-8 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-ink-3" />
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
      <Zap className="size-3.5 fill-xp text-xp" />
    </span>
  );
}

/** Hexagon badge with the level number. */
function LevelBadge({ level, size = 'md' }: { level: number; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center',
        size === 'lg' ? 'size-11' : 'size-8',
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
          'relative font-mono font-black text-on-epic',
          size === 'lg' ? 'text-base' : 'text-sm',
        )}
      >
        {level}
      </span>
    </span>
  );
}

/* ---------- Mobile header ---------- */

const chipClass =
  'relative flex min-h-11 items-center gap-1.5 rounded-xl px-1.5 font-mono text-[0.95rem] font-extrabold tabular-nums text-on-ink transition-colors hover:bg-ink-2';

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

export function LevelChip({ side = 'bottom' }: { side?: Side }) {
  const info = levelFromXp(useProgress((s) => s.xp));
  return (
    <Popover placement={side} content={<LevelDetails />}>
      <button
        type="button"
        className={chipClass}
        aria-label={`Уровень ${info.level}, ${info.rank}`}
      >
        <LevelBadge level={info.level} />
      </button>
    </Popover>
  );
}

/** Compact progress in the mobile header: streak, XP with today's goal, level. */
export function Hud() {
  return (
    <div className="flex items-center gap-0.5" aria-label="Твой прогресс" role="group">
      <StreakChip />
      <XpChip />
      <LevelChip />
    </div>
  );
}

/* ---------- Desktop sidebar ---------- */

const tileClass =
  'relative flex min-h-11 items-center gap-2 rounded-xl bg-ink-3/60 px-2 text-left transition-colors hover:bg-ink-3';

/** Profile card at the top of the sidebar: name, level with progress, streak and XP. */
export function ProgressPanel({ action }: { action?: ReactNode }) {
  const name = useProgress((s) => s.profile.name);
  const info = levelFromXp(useProgress((s) => s.xp));
  const { value, atRisk, activeToday } = useStreakState();
  const { xp, todayXp, goal } = useGoalState();
  return (
    <section
      aria-label="Твой прогресс"
      className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-2 p-3"
    >
      <div className="flex items-center gap-1">
        <Popover placement="right-start" content={<LevelDetails />}>
          <button
            type="button"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-ink-3"
            aria-label={`Уровень ${info.level}, ${info.rank}`}
          >
            <LevelBadge level={info.level} size="lg" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-extrabold text-on-ink">{name || 'Трейдер'}</span>
              <span className="truncate text-xs font-bold text-on-ink-muted">
                Ур. {info.level} · {info.rank}
              </span>
            </span>
          </button>
        </Popover>
        {action}
      </div>
      <span
        className="mx-1 h-1.5 overflow-hidden rounded-full bg-ink-3"
        title={
          info.isMax ? 'Максимальный уровень' : `Ещё ${info.toNext} XP до уровня ${info.level + 1}`
        }
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-linear-to-r from-epic to-ink-accent transition-[width] duration-500"
          style={{ width: `${info.progress * 100}%` }}
        />
      </span>
      <div className="grid grid-cols-2 gap-2">
        <Popover placement="right-start" content={<StreakDetails />}>
          <button type="button" className={tileClass} aria-label={streakLabel(value)}>
            <FlameBadge active={activeToday} atRisk={atRisk} />
            <span className="flex flex-col leading-none">
              <span className="font-mono font-extrabold text-on-ink tabular-nums">{value}</span>
              <span className="mt-1 text-[0.65rem] font-bold text-on-ink-muted">
                {plural(value, ['день', 'дня', 'дней'])}
              </span>
            </span>
          </button>
        </Popover>
        <Popover placement="right-start" content={<GoalDetails />}>
          <button type="button" className={tileClass} aria-label={`Опыт: ${xp} XP`}>
            <GoalRing value={todayXp / goal} />
            <span className="flex flex-col leading-none">
              <span className="font-mono font-extrabold text-on-ink tabular-nums">
                {formatNumber(xp, 0)}
              </span>
              <span className="mt-1 text-[0.65rem] font-bold text-on-ink-muted">XP</span>
            </span>
            <XpFlash />
          </button>
        </Popover>
      </div>
    </section>
  );
}
