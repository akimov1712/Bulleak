import { useId } from 'react';
import { MARK_COLORS, MARK_GLYPH, MARK_SHINE, MARK_VIEWBOX } from './mark';

/** The Bulleak brand mark (decorative: the surrounding link or text carries the name). */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const gradient = useId();
  const { horns, wick, body } = MARK_GLYPH;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={MARK_COLORS.from} />
          <stop offset="1" stopColor={MARK_COLORS.to} />
        </linearGradient>
      </defs>
      <rect width={MARK_VIEWBOX} height={MARK_VIEWBOX} rx={16} fill={`url(#${gradient})`} />
      <path d={MARK_SHINE} fill="#fff" opacity={0.1} />
      {horns.map((d) => (
        <path key={d} d={d} fill={MARK_COLORS.glyph} />
      ))}
      <rect {...wick} fill={MARK_COLORS.glyph} />
      <rect {...body} fill={MARK_COLORS.glyph} />
    </svg>
  );
}
