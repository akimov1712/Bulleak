import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/components/brand/LogoMark';
import { BRAND } from '../brand';
import { paths } from '../paths';

/** «Bull» in the brand green, «eak» in the text colour. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-black tracking-[-0.035em]', className)}>
      <span className="text-bull">{BRAND.name.slice(0, 4)}</span>
      {BRAND.name.slice(4)}
    </span>
  );
}

/** Brand logo linking home: mark + name (+ course tagline in the full variant). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to={paths.home()}
      className={cn('flex min-h-11 items-center gap-2.5 rounded-xl', className)}
      aria-label={`${BRAND.name} — на главную`}
    >
      <LogoMark size={compact ? 36 : 42} className="shrink-0 drop-shadow-sm" />
      <span className="flex flex-col">
        <Wordmark
          className={cn('leading-none', compact ? 'text-xl max-[419px]:sr-only' : 'text-[1.6rem]')}
        />
        {!compact && (
          <span className="mt-1 text-[0.7rem] leading-none font-extrabold text-text-muted">
            {BRAND.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
