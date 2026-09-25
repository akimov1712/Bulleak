import { Children, isValidElement, type ReactNode } from 'react';

/** URL-safe anchor from a heading: keeps Cyrillic, lowercases, dashes for spaces. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

/** Plain text of a React children tree (for heading ids and TOC labels). */
export function textOf(node: ReactNode): string {
  let out = '';
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') out += String(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) out += textOf(child.props.children);
  });
  return out;
}
