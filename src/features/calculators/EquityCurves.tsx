/** Lightweight SVG line chart for one or many equity curves (no charting library needed). */
export function EquityCurves({
  curves,
  baseline,
  label,
  height = 180,
}: {
  curves: readonly (readonly number[])[];
  /** Horizontal reference line (e.g. the starting balance). */
  baseline?: number;
  /** Accessible description of what the chart shows. */
  label: string;
  height?: number;
}) {
  const w = 400;
  const h = height;
  const values = curves.flat();
  if (values.length === 0) return null;
  const max = Math.max(...values, baseline ?? -Infinity);
  const min = Math.min(...values, baseline ?? Infinity);
  const span = max - min || 1;
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 8);
  const many = curves.length > 1;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: h }}
      role="img"
      aria-label={label}
    >
      {baseline !== undefined && (
        <line
          x1={0}
          x2={w}
          y1={y(baseline)}
          y2={y(baseline)}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          className="stroke-text-muted"
        />
      )}
      {curves.map((curve, i) => {
        const first = curve[0] ?? 0;
        const up = (curve.at(-1) ?? 0) >= (baseline ?? first);
        const points = curve
          .map((v, k) => `${(k / Math.max(1, curve.length - 1)) * w},${y(v)}`)
          .join(' ');
        return (
          <polyline
            key={i}
            points={points}
            fill="none"
            strokeWidth={many ? 1.5 : 3}
            strokeOpacity={many ? 0.55 : 1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={up ? 'stroke-bull' : 'stroke-bear'}
          />
        );
      })}
    </svg>
  );
}
