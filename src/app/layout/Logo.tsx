import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/components/brand/LogoMark';
import { BRAND } from '../brand';
import { paths } from '../paths';

/** «Bull» in the brand green, «eak» in the surrounding text colour. */
export function Wordmark({ className, onInk = false }: { className?: string; onInk?: boolean }) {
  return (
    <span className={cn('font-black tracking-[-0.035em]', className)}>
      <span className={onInk ? 'text-ink-accent' : 'text-bull'}>{BRAND.name.slice(0, 4)}</span>
      {BRAND.name.slice(4)}
    </span>
  );
}

/** Brand logo linking home, drawn on the dark navigation chrome. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to={paths.home()}
      className={cn('flex min-h-11 items-center gap-2.5 rounded-xl text-on-ink', className)}
      aria-label={`${BRAND.name} — на главную`}
    >
      <LogoMark size={compact ? 34 : 40} className="shrink-0" />
      <span className="flex flex-col">
        <Wordmark
          onInk
          className={cn('leading-none', compact ? 'text-xl max-[419px]:sr-only' : 'text-[1.55rem]')}
        />
        {!compact && (
          <span className="mt-1 text-[0.7rem] leading-none font-bold text-on-ink-muted">
            {BRAND.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
