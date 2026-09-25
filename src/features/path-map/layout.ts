/** Geometry of the zigzag path (pure, unit-tested). */

export const COLUMN_WIDTH = 300;
export const NODE_SIZE = 72;
export const ROW_HEIGHT = 104;
export const AMPLITUDE = 72;

/** Horizontal offset of the i-th node from the column centre (smooth zigzag). */
export function nodeOffset(index: number): number {
  return Math.round(Math.sin((index * Math.PI) / 3) * AMPLITUDE);
}

export interface NodePoint {
  /** Centre coordinates inside the column. */
  x: number;
  y: number;
}

export function nodePoints(count: number): NodePoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: COLUMN_WIDTH / 2 + nodeOffset(i),
    y: i * ROW_HEIGHT + NODE_SIZE / 2 + 8,
  }));
}

/** Smooth SVG path through the node centres. */
export function pathThrough(points: readonly NodePoint[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M ${first.x} ${first.y}`;
  let prev = first;
  for (const p of rest) {
    const midY = (prev.y + p.y) / 2;
    d += ` C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}
