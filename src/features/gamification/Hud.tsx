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

/** One segment of the HUD bar: badge + value (+ caption on wide screens). */
const segmentClass =
  'relative flex min-h-11 items-center gap-1.5 rounded-[0.9rem] px-1 text-text transition-colors hover:bg-surface-2 sm:gap-2 sm:px-2.5';

function SegmentText({ value, caption }: { value: ReactNode; caption: ReactNode }) {
  return (
    <span className="flex flex-col items-start leading-none">
      <span className="font-mono text-[0.95rem] font-extrabold tabular-nums">{value}</span>
      <span className="mt-1 hidden text-[0.65rem] font-bold whitespace-nowrap text-text-muted md:block">
        {caption}
      </span>
    </span>
  );
}

/** Decorative ring around the XP icon: today's progress to the daily goal. */
function GoalRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <span className="relative grid size-8 shrink-0 place-items-center sm:size-9" aria-hidden="true">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-surface-2" />
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
      <Zap className="size-4 fill-xp text-xp-shade" />
    </span>
  );
}

/** Hexagon badge with the level number. */
function LevelBadge({ level }: { level: number }) {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center sm:size-9" aria-hidden="true">
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
      <span className="relative font-mono text-sm font-black text-on-epic">{level}</span>
    </span>
  );
}

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
        className={segmentClass}
        aria-label={`Серия: ${value} ${plural(value, ['день', 'дня', 'дней'])} подряд`}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center sm:size-9 rounded-full',
            activeToday ? 'bg-linear-to-b from-xp to-mod-orange shadow-sm' : 'bg-surface-2',
          )}
        >
          <Flame
            className={cn(
              'size-5',
              activeToday ? 'fill-white text-white' : 'text-text-muted',
              atRisk && !activeToday && 'text-warn',
            )}
          />
        </span>
        <SegmentText
          value={value}
          caption={
            activeToday ? plural(value, ['день подряд', 'дня подряд', 'дней подряд']) : 'серия'
          }
        />
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
      <button type="button" className={segmentClass} aria-label={`Опыт: ${xp} XP`}>
        <GoalRing value={todayXp / goal} />
        <SegmentText
          value={formatNumber(xp, 0)}
          caption={`цель дня ${Math.min(todayXp, goal)}/${goal}`}
        />
        {flash && (
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
        )}
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
        className={segmentClass}
        aria-label={`Уровень ${info.level}, ${info.rank}`}
      >
        <LevelBadge level={info.level} />
        <span className="hidden w-24 flex-col items-start gap-1.5 leading-none md:flex">
          <span className="text-sm font-extrabold">{info.rank}</span>
          <span
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            aria-hidden="true"
          >
            <span
              className="block h-full rounded-full bg-epic transition-[width] duration-500"
              style={{ width: `${info.progress * 100}%` }}
            />
          </span>
        </span>
      </button>
    </Popover>
  );
}

const Divider = () => <span className="h-6 w-0.5 rounded-full bg-border" aria-hidden="true" />;

/** Progress bar of the header: streak, XP with today's goal, level. */
export function Hud() {
  return (
    <div
      className="flex items-center gap-0.5 rounded-2xl border-2 border-border bg-surface shadow-[0_2px_0_0_var(--border)]"
      aria-label="Твой прогресс"
      role="group"
    >
      <StreakChip />
      <Divider />
      <XpChip />
      <Divider />
      <LevelChip />
    </div>
  );
}
