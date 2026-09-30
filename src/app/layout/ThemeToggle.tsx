import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useResolvedTheme } from '@/hooks/useTheme';
import { useSettings } from '@/store/settingsStore';

/** Light/dark switch for the dark navigation chrome (sidebar, mobile header). */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useResolvedTheme();
  const update = useSettings((s) => s.update);
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => update({ theme: next })}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-xl text-on-ink-muted transition-colors hover:bg-ink-3 hover:text-on-ink',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
