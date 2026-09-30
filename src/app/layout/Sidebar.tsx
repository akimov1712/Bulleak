import { useId } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { ProgressPanel } from '@/features/gamification/Hud';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { mainNav, NAV_GROUPS, secondaryNav, type NavGroup, type NavItem } from './nav';

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[0.94rem] font-bold transition-colors',
          isActive
            ? 'bg-ink-accent/12 text-ink-accent'
            : 'text-on-ink-muted hover:bg-ink-2 hover:text-on-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Brand accent on the sidebar edge for the current section. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-ink-accent transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon className="size-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function SidebarGroup({ group, label }: { group: NavGroup; label: string }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-0.5">
      <p
        id={id}
        className="px-3 pb-1 text-[0.68rem] font-black tracking-[0.16em] text-on-ink-muted uppercase"
      >
        {label}
      </p>
      {mainNav
        .filter((item) => item.group === group)
        .map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
    </div>
  );
}

/** Desktop navigation (≥ lg): brand, learner progress, sections. Replaces the header there. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-y-auto bg-ink lg:flex">
      <Logo className="mx-5 mt-4 mb-3 shrink-0" />
      <div className="mx-3 mb-4 shrink-0">
        <ProgressPanel action={<ThemeToggle />} />
      </div>
      <nav aria-label="Основная навигация" className="flex shrink-0 flex-col gap-3 px-3 pb-3">
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.id} group={g.id} label={g.label} />
        ))}
      </nav>
      <nav
        aria-label="Служебная навигация"
        className="mt-auto grid shrink-0 grid-cols-2 gap-1 border-t border-ink-border px-3 py-2"
      >
        {secondaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  );
}
