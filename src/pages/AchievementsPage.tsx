import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { achievements, RARITY_LABELS } from '@/content/achievements';
import { courseIndex } from '@/content/courseIndex';
import { Pill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useShallow } from 'zustand/react/shallow';
import { useProgress, selectProgressData } from '@/store/progressStore';
import type { AchievementCategory, AchievementRarity } from '@/types/achievements';

const CATEGORIES: { id: AchievementCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'learning', label: 'Обучение' },
  { id: 'habit', label: 'Регулярность' },
  { id: 'practice', label: 'Практика' },
  { id: 'other', label: 'Прочее' },
];

const RARITY: Record<AchievementRarity, { card: string; badge: string }> = {
  common: { card: 'border-border', badge: 'bg-surface-2 text-text-muted' },
  rare: { card: 'border-info', badge: 'bg-info-soft text-info' },
  epic: { card: 'border-epic', badge: 'bg-epic-soft text-epic' },
  legendary: { card: 'border-xp-shade', badge: 'bg-xp text-on-xp' },
};

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function AchievementsPage() {
  usePageTitle('Достижения');
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all');
  // useShallow: selectProgressData builds a new object, compare fields instead of identity.
  const state = useProgress(useShallow(selectProgressData));
  const unlocked = state.achievements;
  const unlockedCount = Object.keys(unlocked).length;
  const shown = achievements.filter((a) => category === 'all' || a.category === category);
  // Unlocked first (newest first), then the rest in definition order.
  const sorted = [...shown].sort((a, b) => (unlocked[b.id] ?? 0) - (unlocked[a.id] ?? 0));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Достижения"
        subtitle={`Получено ${unlockedCount} из ${achievements.length}`}
      />
      <ProgressBar
        label="Получено достижений"
        value={unlockedCount / achievements.length}
        tone="epic"
        size="lg"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Категории">
        {CATEGORIES.map((c) => (
          <Pill key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </Pill>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Список достижений">
        {sorted.map((a) => {
          const at = unlocked[a.id];
          const got = at !== undefined;
          const hidden = a.secret && !got;
          const rarity = RARITY[a.rarity];
          const progress =
            !got && !hidden ? a.progress?.(state, { now: 0, course: courseIndex }) : undefined;
          return (
            <li
              key={a.id}
              className={cn(
                'flex gap-3 rounded-2xl border-2 bg-surface p-4',
                got
                  ? cn(rarity.card, 'shadow-[0_3px_0_0_var(--border)]')
                  : 'border-dashed border-border',
              )}
            >
              <span
                className={cn(
                  'grid size-14 shrink-0 place-items-center rounded-2xl text-3xl',
                  got ? 'bg-surface-2' : 'bg-surface-2 grayscale',
                )}
                aria-hidden="true"
              >
                {hidden ? <Lock className="size-6 text-text-muted" /> : a.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className={cn('font-extrabold', !got && 'text-text-muted')}>
                  {hidden ? '???' : a.title}
                </p>
                <p className="text-sm text-text-muted">
                  {hidden ? 'Секретное достижение — откроется неожиданно' : a.description}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  <span className={cn('rounded-full px-2 py-0.5', rarity.badge)}>
                    {RARITY_LABELS[a.rarity]}
                  </span>
                  <span className="text-xp-text">+{a.xp} XP</span>
                  {got && <span className="text-text-muted">{dateFormat.format(at)}</span>}
                </div>
                {progress && progress.target > 1 && (
                  <div className="flex items-center gap-2 pt-1">
                    <ProgressBar
                      label={`Прогресс: ${a.title}`}
                      value={progress.current / progress.target}
                      size="sm"
                      tone="info"
                    />
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {progress.current}/{progress.target}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
