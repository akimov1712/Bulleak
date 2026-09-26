/** Theme-token colour classes for diagrams. */
export type DiagramTone =
  'text' | 'muted' | 'bull' | 'bear' | 'info' | 'warn' | 'epic' | 'xp' | 'primary';

export const fillOf: Record<DiagramTone, string> = {
  text: 'fill-text',
  muted: 'fill-text-muted',
  bull: 'fill-bull',
  bear: 'fill-bear',
  info: 'fill-info',
  warn: 'fill-warn',
  epic: 'fill-epic',
  xp: 'fill-xp-text',
  primary: 'fill-primary-shade',
};

export const strokeOf: Record<DiagramTone, string> = {
  text: 'stroke-text',
  muted: 'stroke-text-muted',
  bull: 'stroke-bull',
  bear: 'stroke-bear',
  info: 'stroke-info',
  warn: 'stroke-warn',
  epic: 'stroke-epic',
  xp: 'stroke-xp-shade',
  primary: 'stroke-primary-shade',
};

export const softFillOf: Partial<Record<DiagramTone, string>> = {
  bull: 'fill-bull-soft',
  bear: 'fill-bear-soft',
  info: 'fill-info-soft',
  warn: 'fill-warn-soft',
  epic: 'fill-epic-soft',
};
