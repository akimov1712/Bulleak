import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Simplified Bybit screen mock-ups (no screenshots — see docs/03-content/bybit-mockups.md).
 * Built with HTML so text reflows on phones; numbered hotspots open an explanation.
 */

export interface Hotspot {
  n: number;
  title: string;
  text: ReactNode;
}

interface MockupProps {
  /** Screen name shown in the fake window bar. */
  screen: string;
  children: (active: number | null, toggle: (n: number) => void) => ReactNode;
  hotspots: Hotspot[];
  /** Month and year the layout was checked against Bybit Help Center. */
  checked: string;
}

export function Mockup({ screen, children, hotspots, checked }: MockupProps) {
  const [active, setActive] = useState<number | null>(null);
  const toggle = (n: number) => setActive((a) => (a === n ? null : n));
  const id = useId();
  const current = hotspots.find((h) => h.n === active);
  return (
    <div
      role="group"
      aria-label={`Упрощённая схема экрана Bybit «${screen}» с пояснениями`}
      className="overflow-hidden rounded-2xl border-2 border-border bg-surface"
    >
      <div className="flex items-center gap-2 border-b-2 border-border bg-surface-2 px-3 py-2">
        <span className="size-2.5 rounded-full bg-bear/70" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-xp/80" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-bull/70" aria-hidden="true" />
        <span className="ml-2 truncate text-xs font-bold text-text-muted">Bybit · {screen}</span>
      </div>
      <div className="p-3 sm:p-4">{children(active, toggle)}</div>
      <div className="border-t-2 border-border p-3" aria-live="polite" id={`${id}-note`}>
        {current ? (
          <div className="flex gap-3">
            <HotspotBadge n={current.n} active />
            <div className="text-sm">
              <p className="font-extrabold">{current.title}</p>
              <div className="text-text-muted">{current.text}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Нажми на номер, чтобы узнать, что это.</p>
        )}
      </div>
      <p className="bg-surface-2 px-3 py-1.5 text-center text-xs text-text-muted">
        Упрощённая схема интерфейса Bybit на {checked}. Реальный вид может отличаться.
      </p>
    </div>
  );
}

export function HotspotBadge({
  n,
  active,
  onClick,
  label,
}: {
  n: number;
  active?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  const className = cn(
    'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
    active ? 'bg-xp text-on-xp ring-2 ring-xp-shade' : 'bg-info text-surface',
  );
  if (!onClick) return <span className={className}>{n}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Пояснение ${n}${label ? `: ${label}` : ''}`}
      className={cn(className, 'transition-transform hover:scale-110')}
    >
      {n}
    </button>
  );
}

/** A settings-style row: label, status on the right, optional hotspot. */
export function MockRow({
  label,
  hint,
  status,
  tone = 'muted',
  hotspot,
  active,
  onHotspot,
}: {
  label: string;
  hint?: string;
  status: string;
  tone?: 'bull' | 'warn' | 'muted';
  hotspot?: number;
  active?: boolean;
  onHotspot?: (n: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5',
        active ? 'border-xp-shade bg-xp/10' : 'border-transparent',
      )}
    >
      {hotspot !== undefined && onHotspot && (
        <HotspotBadge
          n={hotspot}
          active={active}
          onClick={() => onHotspot(hotspot)}
          label={label}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold',
          tone === 'bull' && 'bg-bull-soft text-bull',
          tone === 'warn' && 'bg-warn-soft text-warn',
          tone === 'muted' && 'bg-surface-2 text-text-muted',
        )}
      >
        {status}
      </span>
    </div>
  );
}
