import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { IChartApi } from 'lightweight-charts';
import { zoomRange } from '@/lib/charts/zoom';
import { cn } from '@/lib/cn';

const buttonClass =
  "relative grid size-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text before:absolute before:-inset-1.5 before:content-['']";

/**
 * Zoom buttons for a lightweight-charts chart: closer / farther around the latest candles,
 * back to the initial view, and (optionally) the chart in a large window.
 */
export function ChartControls({
  getChart,
  total,
  onReset,
  onExpand,
  className,
}: {
  /** The chart, if built (it is recreated on data or theme changes). */
  getChart: () => IChartApi | null;
  /** Number of bars in the series: zoom-out stops around the whole series. */
  total: number;
  onReset: () => void;
  onExpand?: () => void;
  className?: string;
}) {
  const zoom = (factor: number) => {
    const timeScale = getChart()?.timeScale();
    const range = timeScale?.getVisibleLogicalRange();
    if (!timeScale || !range) return;
    timeScale.setVisibleLogicalRange(zoomRange(range, factor, total));
  };
  return (
    <div role="group" aria-label="Масштаб графика" className={cn('flex items-center', className)}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => zoom(0.6)}
        aria-label="Приблизить"
        title="Приблизить"
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => zoom(1 / 0.6)}
        aria-label="Отдалить"
        title="Отдалить"
      >
        <ZoomOut className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={onReset}
        aria-label="Исходный масштаб"
        title="Исходный масштаб"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
      </button>
      {onExpand && (
        <button
          type="button"
          className={buttonClass}
          onClick={onExpand}
          aria-label="Открыть график на весь экран"
          title="На весь экран"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
