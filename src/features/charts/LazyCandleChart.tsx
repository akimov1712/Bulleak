import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { CandleChartProps } from './CandleChart';
import { chartCardHeight } from './chartLayout';

// lightweight-charts is ~180 KB: load it only when a chart is actually on screen.
const CandleChartImpl = lazy(() =>
  import('./CandleChart').then((m) => ({ default: m.CandleChart })),
);

/** Code-split CandleChart for lessons and quizzes. */
export function LazyCandleChart(props: CandleChartProps) {
  return (
    <Suspense
      fallback={
        <div
          style={{ height: chartCardHeight(props.height ?? 400, props.ohlc !== false) }}
          className={props.className}
        >
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      }
    >
      <CandleChartImpl {...props} />
    </Suspense>
  );
}
