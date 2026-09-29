import { useId } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import type { ModuleColor } from '@/types/course';
import { Logo } from './Logo';
import { SidebarContinue } from './SidebarContinue';
import { mainNav, NAV_GROUPS, secondaryNav, type NavGroup, type NavItem } from './nav';

/** Icon tile colours (Tailwind needs literal class names). */
const tiles: Record<ModuleColor, { soft: string; solid: string }> = {
  green: {
    soft: 'bg-mod-green/15 text-mod-green-shade dark:text-mod-green',
    solid: 'bg-mod-green',
  },
  blue: { soft: 'bg-mod-blue/15 text-mod-blue-shade dark:text-mod-blue', solid: 'bg-mod-blue' },
  purple: {
    soft: 'bg-mod-purple/15 text-mod-purple-shade dark:text-mod-purple',
    solid: 'bg-mod-purple',
  },
  orange: {
    soft: 'bg-mod-orange/15 text-mod-orange-shade dark:text-mod-orange',
    solid: 'bg-mod-orange',
  },
  pink: { soft: 'bg-mod-pink/15 text-mod-pink-shade dark:text-mod-pink', solid: 'bg-mod-pink' },
  teal: { soft: 'bg-mod-teal/15 text-mod-teal-shade dark:text-mod-teal', solid: 'bg-mod-teal' },
  yellow: {
    soft: 'bg-mod-yellow/20 text-mod-yellow-shade dark:text-mod-yellow',
    solid: 'bg-mod-yellow',
  },
  red: { soft: 'bg-mod-red/15 text-mod-red-shade dark:text-mod-red', solid: 'bg-mod-red' },
};

function SidebarLink({ item, small = false }: { item: NavItem; small?: boolean }) {
  const Icon = item.icon;
  const tile = tiles[item.tone];
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-11 shrink-0 items-center rounded-xl px-2 transition-colors',
          small ? 'gap-2 text-sm' : 'gap-3 text-[0.94rem]',
          isActive
            ? 'bg-surface-2 font-extrabold text-text'
            : 'font-bold text-text-muted hover:bg-surface-2/70 hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Brand accent on the sidebar edge for the current section. */}
          <span
            hidden={small}
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'grid shrink-0 place-items-center rounded-lg transition-colors',
              small ? 'size-7' : 'size-8',
              isActive ? cn(tile.solid, 'text-white shadow-sm') : tile.soft,
            )}
          >
            <Icon className={small ? 'size-4' : 'size-[1.125rem]'} strokeWidth={2.4} />
          </span>
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
        className="px-2 pb-1 text-[0.68rem] font-black tracking-[0.14em] text-text-muted uppercase"
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

/** Desktop navigation (≥ lg). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-y-auto border-r-2 border-border bg-surface lg:flex">
      <Logo className="mx-3 mt-5 mb-4 shrink-0 px-2 py-1" />
      <SidebarContinue />
      <nav aria-label="Основная навигация" className="flex shrink-0 flex-col gap-4 px-3 pb-4">
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.id} group={g.id} label={g.label} />
        ))}
      </nav>
      <nav
        aria-label="Служебная навигация"
        className="mt-auto grid shrink-0 grid-cols-2 gap-1 border-t-2 border-border px-3 pt-3 pb-4"
      >
        {secondaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} small />
        ))}
      </nav>
    </aside>
  );
}
