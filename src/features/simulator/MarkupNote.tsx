import { formatNumber } from '@/lib/format';
import type { ChartHints } from '@/lib/hints/chart';

const TREND = { up: 'вверх', down: 'вниз', flat: 'боком' } as const;

/** What the markup shows, in words; the decision stays with the learner. */
export function MarkupNote({ hints, tick }: { hints: ChartHints; tick: number }) {
  const digits = Math.max(0, Math.round(-Math.log10(tick)));
  const price = (p: number) => formatNumber(p, digits);
  return (
    <p className="text-sm text-text-muted" role="note">
      Разметка: S и R — последние свинг-минимумы и максимумы
      {hints.trend && <>; EMA 50 смотрит {TREND[hints.trend]}</>}
      {hints.stopLong !== null && <>; стоп для лонга — ниже {price(hints.stopLong)}</>}
      {hints.stopShort !== null && <>, для шорта — выше {price(hints.stopShort)}</>}. Это разметка,
      а не сигнал: входить или нет — решаешь ты.
    </p>
  );
}
