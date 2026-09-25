import { Flame } from 'lucide-react';
import { cn } from '@/lib/cn';
import { weekView } from '@/lib/gamification/streak';
import { useProgress } from '@/store/progressStore';
import { useToday } from '@/hooks/useToday';

/** Monday–Sunday dots of this week's activity (used in the HUD popover and on the home page). */
export function WeekStreak({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const today = useToday();
  const activity = useProgress((s) => s.activity);
  const week = weekView(activity, today);
  return (
    <ol className="flex justify-between" aria-label="Активность на этой неделе">
      {week.map((d) => (
        <li
          key={d.day}
          className="flex flex-col items-center gap-1 text-xs font-bold text-text-muted"
        >
          <span
            className={cn(
              'grid place-items-center rounded-full border-2',
              size === 'sm' ? 'size-7' : 'size-8',
              d.active ? 'border-xp-shade bg-xp text-on-xp' : 'border-border',
              d.isToday && !d.active && 'border-dashed border-info',
              d.isFuture && 'opacity-40',
            )}
          >
            {d.active && <Flame className="size-4" aria-label="занимался" />}
          </span>
          {d.label}
        </li>
      ))}
    </ol>
  );
}
