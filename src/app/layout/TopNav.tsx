import { lazy, Suspense, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
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
import { NAV_SECTIONS, secondaryNav, sectionOf, type NavItem, type NavSection } from './nav';

const CommandPalette = lazy(() =>
  import('@/features/search/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Link row in a section menu: icon, label and one-line description. */
function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-start gap-3 rounded-(--radius-btn) p-2.5 transition-colors hover:bg-surface-2',
          isActive && 'bg-surface-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-bg transition-colors',
              isActive ? 'text-bull' : 'text-text-muted group-hover:text-text',
            )}
          >
            <Icon className="size-[1.1rem]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">{item.label}</span>
            {item.description && (
              <span className="text-xs text-text-muted">{item.description}</span>
            )}
          </span>
        </>
      )}
    </NavLink>
  );
}

function SectionMenu({ section, active }: { section: NavSection; active: boolean }) {
  return (
    <Dropdown
      hover
      className="w-80"
      trigger={(props, open) => (
        <button
          type="button"
          {...props}
          aria-current={active ? 'true' : undefined}
          className={cn(
            'relative flex h-9 items-center gap-1 rounded-(--radius-btn) px-3 text-sm font-medium transition-colors',
            active || open ? 'text-text' : 'text-text-muted hover:text-text',
            open && 'bg-surface-2',
          )}
        >
          {section.label}
          <ChevronDown
            className={cn('size-3.5 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
          {/* Current section: brand line along the bottom edge of the bar. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-x-3 -bottom-[0.6875rem] h-0.5 rounded-full bg-primary transition-opacity',
              active ? 'opacity-100' : 'opacity-0',
            )}
          />
        </button>
      )}
    >
      {(close) => (
        <ul className="flex flex-col gap-0.5" aria-label={section.label}>
          {section.items.map((item) => (
            <li key={item.to}>
              <MenuLink item={item} onNavigate={close} />
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
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
              {secondaryNav.map((item) => {
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
 * Site header: logo, section menus (desktop), search, streak and XP, profile menu.
 * On phones the sections live in the bottom bar.
 */
export function TopNav() {
  const { pathname } = useLocation();
  const current = sectionOf(pathname);
  const searchOpen = useUi((s) => s.searchOpen);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  useSearchShortcut();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-4 md:px-6">
        <Logo className="mr-2 lg:mr-4" />
        <nav aria-label="Основная навигация" className="flex items-center gap-0.5 max-lg:hidden">
          {NAV_SECTIONS.map((s) => (
            <SectionMenu key={s.id} section={s} active={current === s.id} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <Hud className="max-[339px]:hidden" />
          <ProfileMenu />
        </div>
      </div>
      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
