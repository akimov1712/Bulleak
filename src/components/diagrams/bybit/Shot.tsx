import { useId, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { HotspotBadge, type Hotspot } from './Mockup';

/** A numbered zone on a screenshot; `x` / `y` — badge centre, % of the image size. */
export interface ShotHotspot extends Hotspot {
  x: number;
  y: number;
}

interface ShotProps {
  /** Path under public/, e.g. `img/bybit/terminal.webp` (scripts/bybit-shots.ts). */
  src: string;
  width: number;
  height: number;
  /** Screen name for the frame and the accessible label. */
  screen: string;
  /** What the image shows, for screen readers. */
  alt: string;
  hotspots: ShotHotspot[];
  /** Month and year of the capture. */
  taken: string;
  /** Narrow screens (a side panel): limit the width so the image is not blown up. */
  maxWidth?: number;
  /** Where the screen comes from (shown in the caption). */
  source?: string;
}

/**
 * Real Bybit screenshot with numbered zones: tap a number to read what that part is for.
 * Screens come from the public testnet (same web interface as bybit.com).
 */
export function BybitShot({
  src,
  width,
  height,
  screen,
  alt,
  hotspots,
  taken,
  maxWidth,
  source = 'тестовая сеть testnet.bybit.com — интерфейс как на основном сайте, цены учебные',
}: ShotProps) {
  const [active, setActive] = useState<number | null>(null);
  const toggle = (n: number) => setActive((a) => (a === n ? null : n));
  const id = useId();
  const url = `${import.meta.env.BASE_URL}${src}`;
  const current = hotspots.find((h) => h.n === active);
  return (
    <div
      role="group"
      aria-label={`Скриншот Bybit «${screen}»${hotspots.length > 0 ? ' с пояснениями' : ''}`}
      className="mx-auto overflow-hidden rounded-2xl border-2 border-border bg-surface"
      style={maxWidth ? { maxWidth } : undefined}
    >
      <div className="relative bg-ink">
        <img
          src={url}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        {hotspots.map((h) => (
          <span
            key={h.n}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <HotspotBadge
              n={h.n}
              active={active === h.n}
              onClick={() => toggle(h.n)}
              label={h.title}
              className="size-7 text-sm shadow-lg ring-2 ring-white sm:size-8"
            />
          </span>
        ))}
      </div>
      {hotspots.length > 0 && (
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
            <p className="text-sm text-text-muted">
              Нажми на номер на скриншоте, чтобы узнать, что это.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 bg-surface-2 px-3 py-1 text-xs text-text-muted">
        <p className="py-0.5">
          Скриншот Bybit, {taken}: {source}. Bybit обновляет дизайн, детали могут отличаться.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-bold text-info hover:underline"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
          Открыть в полном размере
        </a>
      </div>
    </div>
  );
}
