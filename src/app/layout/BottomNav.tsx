import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/Modal';
import { mobileBarNav, NAV_SECTIONS, secondaryNav } from './nav';

const itemClass = (active: boolean) =>
  cn(
    'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors',
    active ? 'text-text' : 'text-text-muted hover:text-text',
  );

/** Thin brand line above the current tab. */
const Marker = ({ active }: { active: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      'absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity',
      active ? 'opacity-100' : 'opacity-0',
    )}
  />
);

const barPaths = new Set(mobileBarNav.map((item) => item.to));

/** Phone/tablet navigation (< lg): 4 most used pages + "Ещё" with every section. */
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const moreActive =
    !barPaths.has(pathname) &&
    !mobileBarNav.some((item) => !item.end && pathname.startsWith(`${item.to}/`));

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-stretch px-2">
          {mobileBarNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => itemClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Marker active={isActive} />
                    <Icon
                      className={cn('size-[1.35rem]', isActive && 'text-bull')}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            type="button"
            className={itemClass(moreActive)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <Marker active={moreActive} />
            <LayoutGrid
              className={cn('size-[1.35rem]', moreActive && 'text-bull')}
              strokeWidth={2}
              aria-hidden="true"
            />
            Ещё
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Разделы" variant="sheet">
        <div className="flex flex-col gap-4">
          {[...NAV_SECTIONS, { id: 'other', label: 'Ещё', items: secondaryNav }].map((section) => (
            <section key={section.id} aria-label={section.label}>
              <h3 className="mb-1.5 text-xs font-medium text-text-muted">{section.label}</h3>
              <ul className="grid grid-cols-2 gap-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-12 items-center gap-2.5 rounded-(--radius-btn) border px-3 text-sm font-medium',
                            isActive
                              ? 'border-bull/40 bg-bull-soft text-bull'
                              : 'border-border bg-surface text-text hover:bg-surface-2',
                          )
                        }
                      >
                        <Icon className="size-[1.1rem] shrink-0" aria-hidden="true" />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
