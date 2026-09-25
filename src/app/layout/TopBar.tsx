import { Flame, Moon, Star, Sun, Zap } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useResolvedTheme } from '@/hooks/useTheme';
import { useSettings } from '@/store/settingsStore';
import { Logo } from './Logo';

function ThemeToggle() {
  const theme = useResolvedTheme();
  const update = useSettings((s) => s.update);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      icon={theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      onClick={() => update({ theme: next })}
    />
  );
}

/**
 * HUD chips. Values are static until the gamification store lands (T-306);
 * the layout is final so the shell does not jump later.
 */
function HudChips() {
  return (
    <ul className="flex items-center gap-0.5 sm:gap-2" aria-label="Твой прогресс">
      <li
        className="flex items-center gap-1 rounded-full px-1.5 py-1 font-extrabold sm:px-2 text-text-muted"
        title="Стрик: дней подряд"
      >
        <Flame className="size-5 text-text-muted" aria-hidden="true" />
        <span className="font-mono tabular-nums">0</span>
        <span className="sr-only">дней подряд</span>
      </li>
      <li
        className="flex items-center gap-1 rounded-full px-1.5 py-1 font-extrabold sm:px-2 text-text"
        title="Опыт (XP)"
      >
        <Zap className="size-5 fill-xp text-xp-shade" aria-hidden="true" />
        <span className="font-mono tabular-nums">0</span>
        <span className="sr-only">XP</span>
      </li>
      <li
        className="flex items-center gap-1 rounded-full px-1.5 py-1 font-extrabold sm:px-2 text-text"
        title="Уровень"
      >
        <Star className="size-5 fill-epic text-epic" aria-hidden="true" />
        <span className="font-mono tabular-nums">1</span>
        <span className="sr-only">уровень</span>
      </li>
    </ul>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
        <Logo compact className="lg:hidden" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
          <HudChips />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
