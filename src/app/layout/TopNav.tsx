import { Fragment, lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ChevronDown, Moon, Search, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { levelFromXp } from '@/lib/gamification/levels';
import { Hud, LevelBadge, ProfileSummary } from '@/features/gamification/Hud';
import { useResolvedTheme } from '@/hooks/useTheme';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { useUi } from '@/store/uiStore';
import { Dropdown } from './Dropdown';
import { Logo } from './Logo';
import { isItemActive, NAV_SECTIONS, secondaryNav, type NavItem } from './nav';

const CommandPalette = lazy(() =>
  import('@/features/search/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** One tab of the second header row: icon (from xl) and label, brand line under the current one. */
function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-label={item.short ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex shrink-0 items-center gap-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors xl:px-3',
        active ? 'text-text' : 'text-text-muted hover:text-text',
      )}
    >
      <Icon className={cn('size-4 max-xl:hidden', active && 'text-bull')} aria-hidden="true" />
      {item.short ? (
        <>
          <span className="xl:hidden">{item.short}</span>
          <span className="max-xl:hidden">{item.label}</span>
        </>
      ) : (
        item.label
      )}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
    </Link>
  );
}

/** Every section one click away (desktop): groups of tabs separated by thin dividers. */
function SectionTabs({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Основная навигация" className="border-t border-border max-lg:hidden">
      <div className="mx-auto flex h-11 w-full max-w-[1600px] items-stretch overflow-x-auto px-3 [scrollbar-width:none] sm:px-4 md:px-6">
        {NAV_SECTIONS.map((section, i) => (
          <Fragment key={section.id}>
            {i > 0 && <span className="mx-1.5 my-3 w-px shrink-0 bg-border" aria-hidden="true" />}
            {section.items
              .filter((item) => !item.hideInTabs)
              .map((item) => (
                <Tab key={item.to} item={item} active={isItemActive(item, pathname)} />
              ))}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}

function ThemeRow() {
  const theme = useResolvedTheme();
  const update = useSettings((s) => s.update);
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => update({ theme: next })}
      className="flex h-10 w-full items-center gap-3 rounded-(--radius-btn) px-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-2"
    >
      <Icon className="size-4 text-text-muted" aria-hidden="true" />
      {next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    </button>
  );
}

function ProfileMenu() {
  const name = useProgress((s) => s.profile.name);
  const info = levelFromXp(useProgress((s) => s.xp));
  return (
    <Dropdown
      placement="bottom-end"
      className="w-72"
      trigger={(props, open) => (
        <button
          type="button"
          {...props}
          aria-label={`Профиль: уровень ${info.level}, ${info.rank}`}
          className={cn(
            'flex h-9 items-center gap-2 rounded-(--radius-btn) pr-2 pl-1 transition-colors hover:bg-surface-2',
            open && 'bg-surface-2',
          )}
        >
          <LevelBadge level={info.level} />
          <span className="max-w-32 truncate text-sm font-medium max-xl:hidden">
            {name || 'Трейдер'}
          </span>
          <ChevronDown className="size-3.5 text-text-muted max-sm:hidden" aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-2">
          <div className="p-2">
            <ProfileSummary />
          </div>
          <div className="border-t border-border pt-2">
            <ul className="flex flex-col gap-0.5" aria-label="Профиль">
              {[
                ...secondaryNav,
                ...NAV_SECTIONS.flatMap((sec) => sec.items).filter((item) => item.hideInTabs),
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={close}
                      className={({ isActive }) =>
                        cn(
                          'flex h-10 items-center gap-3 rounded-(--radius-btn) px-2.5 text-sm font-medium transition-colors hover:bg-surface-2',
                          isActive && 'bg-surface-2',
                        )
                      }
                    >
                      <Icon className="size-4 text-text-muted" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
              <li>
                <ThemeRow />
              </li>
            </ul>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

function SearchButton() {
  const setOpen = useUi((s) => s.setSearchOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Поиск по курсу"
        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
        className="flex h-9 w-60 items-center gap-2 rounded-(--radius-btn) border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-text-muted/40 hover:text-text max-lg:hidden xl:w-72"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Поиск</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 font-mono text-[0.7rem] leading-5">
          {IS_MAC ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Поиск по курсу"
        className="grid size-9 place-items-center rounded-(--radius-btn) text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
      >
        <Search className="size-[1.15rem]" aria-hidden="true" />
      </button>
    </>
  );
}

/** Ctrl/⌘+K anywhere, or "/" outside text fields, opens the search. */
function useSearchShortcut() {
  const setOpen = useUi((s) => s.setSearchOpen);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((e.key === 'k' || e.key === 'K' || e.code === 'KeyK') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);
}

/**
 * Site header: logo, search, streak and XP, profile menu; on desktop a second row with every
 * section as a tab. On phones the sections live in the bottom bar.
 */
export function TopNav() {
  const { pathname } = useLocation();
  const searchOpen = useUi((s) => s.searchOpen);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  useSearchShortcut();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-4 md:px-6">
        <Logo className="mr-2" />
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <Hud className="max-[339px]:hidden" />
          <ProfileMenu />
        </div>
      </div>
      <SectionTabs pathname={pathname} />
      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
