import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

/** 0–3 quiz stars with an accessible label ("2 из 3 звёзд"). */
export function Stars({
  count,
  size = 'size-8',
  className,
}: {
  count: 0 | 1 | 2 | 3;
  size?: string;
  className?: string;
}) {
  return (
    <span className={cn('flex gap-1', className)} role="img" aria-label={`${count} из 3 звёзд`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(size, i <= count ? 'fill-xp text-xp-shade' : 'fill-surface-2 text-border')}
        />
      ))}
    </span>
  );
}
