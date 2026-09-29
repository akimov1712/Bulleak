import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/Modal';
import { mobileBarNav, mobileMoreNav } from './nav';

const itemClass = (active: boolean) =>
  cn(
    'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.7rem] font-extrabold transition-colors',
    active ? 'text-bull' : 'text-text-muted hover:text-text',
  );

/** Mobile/tablet navigation (< lg): 4 main sections + "Ещё" sheet. */
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const moreActive = mobileMoreNav.some((item) => pathname.startsWith(item.to));

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-stretch gap-1 px-2 py-1">
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
                    <span
                      className={cn(
                        'grid h-8 w-12 place-items-center rounded-full transition-colors',
                        isActive && 'bg-bull-soft',
                      )}
                    >
                      <Icon className="size-6" strokeWidth={2.4} aria-hidden="true" />
                    </span>
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
            <span
              className={cn(
                'grid h-8 w-12 place-items-center rounded-full',
                moreActive && 'bg-bull-soft',
              )}
            >
              <MoreHorizontal className="size-6" strokeWidth={2.4} aria-hidden="true" />
            </span>
            Ещё
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Разделы" variant="sheet">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mobileMoreNav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center text-sm font-extrabold',
                      isActive
                        ? 'border-bull/50 bg-bull-soft text-bull'
                        : 'border-border bg-surface text-text hover:bg-surface-2',
                    )
                  }
                >
                  <Icon className="size-6" strokeWidth={2.4} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
