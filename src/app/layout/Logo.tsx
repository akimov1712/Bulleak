import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { Mascot } from '@/components/mascot/Mascot';
import { paths } from '../paths';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to={paths.home()}
      className={cn('flex items-center gap-2 rounded-xl', className)}
      aria-label="Трейдинг на Bybit с нуля — на главную"
    >
      <Mascot mood="happy" size={compact ? 36 : 44} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-lg font-black tracking-tight text-bull',
            compact && 'hidden min-[420px]:inline',
          )}
        >
          Трейдинг
        </span>
        {!compact && (
          <span className="text-xs font-extrabold tracking-wide text-text-muted">
            на Bybit с нуля
          </span>
        )}
      </span>
    </Link>
  );
}
