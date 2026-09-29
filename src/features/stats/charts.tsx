import { cn } from '@/lib/cn';
import { fromDateKey } from '@/lib/date';
import type { HeatCell } from '@/lib/stats/learning';

const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

/** Vertical bars (XP per day, R histogram). Colors come from theme tokens. */
export function Bars({
  values,
  labels,
  label,
  tone = 'fill-xp',
  negativeTone = 'fill-bear',
  height = 140,
}: {
  values: readonly number[];
  /** Tooltip text per bar. */
  labels: readonly string[];
  label: string;
  tone?: string;
  negativeTone?: string;
  height?: number;
}) {
  const w = 400;
  const max = Math.max(1, ...values.map(Math.abs));
  const bw = w / Math.max(1, values.length);
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      {values.map((v, i) => {
        const h = (Math.abs(v) / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.12}
            y={height - h}
            width={bw * 0.76}
            height={Math.max(h, v === 0 ? 0 : 2)}
            rx={Math.min(3, bw * 0.2)}
            className={v < 0 ? negativeTone : tone}
          >
            <title>{labels[i]}</title>
          </rect>
        );
      })}
    </svg>
  );
}

const HEAT: Record<HeatCell['level'], string> = {
  0: 'bg-surface-2',
  1: 'bg-primary/25',
  2: 'bg-primary/50',
  3: 'bg-primary/75',
  4: 'bg-primary',
};

/** GitHub-style activity calendar: one column per week, Monday on top. */
export function Heatmap({ weeks }: { weeks: readonly (readonly HeatCell[])[] }) {
  return (
    <div tabIndex={0} role="region" aria-label="Календарь активности" className="overflow-x-auto">
      <div className="inline-flex gap-[3px]" role="img" aria-label="Календарь активности по дням">
        {weeks.map((week) => (
          <div key={week[0]?.key} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <span
                key={cell.key}
                title={
                  cell.future
                    ? undefined
                    : `${dayFormat.format(fromDateKey(cell.key))}: ${cell.xp} XP`
                }
                className={cn(
                  'size-3 rounded-[3px]',
                  cell.future ? 'bg-transparent' : HEAT[cell.level],
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-text-muted">
        меньше
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <span key={l} className={cn('size-3 rounded-[3px]', HEAT[l])} />
        ))}
        больше XP
      </p>
    </div>
  );
}

/** Horizontal progress bar with a label and value text. */
export function HBar({
  label,
  value,
  text,
  barClass,
}: {
  label: string;
  /** 0–1 */
  value: number;
  text: string;
  barClass: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-bold">{label}</span>
        <span className="shrink-0 text-text-muted tabular-nums">{text}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full', barClass)}
          style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
