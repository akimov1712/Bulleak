import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/components/brand/LogoMark';
import { BRAND } from '../brand';
import { paths } from '../paths';

/** «Bull» in the brand green, «eak» in the surrounding text colour. */
export function Wordmark({ className, onInk = false }: { className?: string; onInk?: boolean }) {
  return (
    <span className={cn('font-bold tracking-[-0.035em]', className)}>
      <span className={onInk ? 'text-ink-accent' : 'text-bull'}>{BRAND.name.slice(0, 4)}</span>
      {BRAND.name.slice(4)}
    </span>
  );
}

/** Brand logo linking home, for the top bar. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to={paths.home()}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-(--radius-btn) text-text',
        className,
      )}
      aria-label={`${BRAND.name} — на главную`}
    >
      <LogoMark size={30} className="shrink-0" />
      <Wordmark className="text-[1.2rem] leading-none max-[379px]:sr-only" />
    </Link>
  );
}
