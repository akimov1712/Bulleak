/**
 * Bulleak brand mark: a bull's head drawn as a candlestick (body = head, wick, two horns)
 * on a green tile. One source for the React logo, favicon and PWA icons (scripts/gen-icons.ts).
 * Brand colors are fixed in both themes, like any logo.
 */
export const MARK_VIEWBOX = 64;

export const MARK_COLORS = {
  /** Tile gradient, top-left → bottom-right. */
  from: '#34E08A',
  to: '#0A8A47',
  glyph: '#FFFFFF',
} as const;

/** Soft highlight over the top of the tile. */
export const MARK_SHINE = 'M0 16A16 16 0 0 1 16 0H48A16 16 0 0 1 64 16V24C44 30 20 30 0 24Z';

export const MARK_GLYPH = {
  horns: [
    'M24.5 31.5C13.5 31.5 7 23.5 7 10C11 18.5 16.5 24 24.5 24.5Z',
    'M39.5 31.5C50.5 31.5 57 23.5 57 10C53 18.5 47.5 24 39.5 24.5Z',
  ],
  wick: { x: 30.5, y: 13, width: 3, height: 44, rx: 1.5 },
  body: { x: 22.5, y: 20, width: 19, height: 29, rx: 5.5 },
} as const;

/**
 * Standalone SVG markup of the mark (favicon, icon generation).
 * `radius` — tile corner radius in viewBox units (0 = full-bleed square), `scale` — glyph size
 * relative to the tile (maskable icons keep it inside the safe zone).
 */
export function markSvg({ radius = 16, scale = 1 }: { radius?: number; scale?: number } = {}) {
  const { horns, wick, body } = MARK_GLYPH;
  const offset = (MARK_VIEWBOX * (1 - scale)) / 2;
  const rect = (r: { x: number; y: number; width: number; height: number; rx: number }) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="${MARK_COLORS.glyph}"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}">`,
    `<defs><linearGradient id="bulleak-tile" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="${MARK_COLORS.from}"/><stop offset="1" stop-color="${MARK_COLORS.to}"/>`,
    `</linearGradient></defs>`,
    `<rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" rx="${radius}" fill="url(#bulleak-tile)"/>`,
    radius > 0 ? `<path d="${MARK_SHINE}" fill="#fff" opacity=".1"/>` : '',
    `<g transform="translate(${offset} ${offset}) scale(${scale})">`,
    ...horns.map((d) => `<path d="${d}" fill="${MARK_COLORS.glyph}"/>`),
    rect(wick),
    rect(body),
    `</g></svg>`,
  ].join('');
}
