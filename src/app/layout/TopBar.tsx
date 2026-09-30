import { Hud } from '@/features/gamification/Hud';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/** Mobile/tablet header (< lg): brand and compact progress. On desktop the sidebar has both. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
        <Logo compact />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <Hud />
          <ThemeToggle className="max-[359px]:hidden" />
        </div>
      </div>
    </header>
  );
}
