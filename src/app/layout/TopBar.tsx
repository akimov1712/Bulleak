import { Moon, Sun } from 'lucide-react';
import { Hud } from '@/features/gamification/Hud';
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
      variant="surface"
      className="size-11 rounded-2xl shadow-[0_2px_0_0_var(--border)] max-[359px]:hidden sm:size-12"
      onClick={() => update({ theme: next })}
    />
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
        <Logo compact className="lg:hidden" />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <Hud />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
