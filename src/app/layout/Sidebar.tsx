import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { mainNav, secondaryNav, type NavItem } from './nav';

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 items-center gap-3 rounded-2xl border-2 px-3.5 text-[0.95rem] font-extrabold tracking-wide transition-colors',
          isActive
            ? 'border-info/60 bg-info-soft text-info'
            : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text',
        )
      }
    >
      <Icon className="size-6 shrink-0" strokeWidth={2.4} aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

/** Desktop navigation (≥ lg). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-border bg-surface px-3 py-5 lg:flex">
      <Logo className="mb-4 px-2" />
      <nav aria-label="Основная навигация" className="flex flex-col gap-1">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
      <nav aria-label="Служебная навигация" className="mt-auto flex flex-col gap-1 pt-4">
        {secondaryNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  );
}
