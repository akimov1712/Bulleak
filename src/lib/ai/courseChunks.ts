/**
 * Course index for the assistant (T-2105): lessons, glossary terms and cheat sheets cut into
 * short plain-text excerpts. Pure: the sources are passed in; the server searches the result.
 */
import type { CourseChunk } from '@bulleak/shared';

export interface LessonSource {
  id: string;
  title: string;
  /** Raw MDX of the lesson. */
  mdx: string;
}

export interface TermSource {
  id: string;
  term: string;
  aliases: readonly string[];
  short: string;
  full: string;
}

export interface CheatsheetSource {
  id: string;
  title: string;
  sections: readonly { title: string; items: readonly string[] }[];
}

/** Longest excerpt; a longer section is split by paragraphs. */
export const CHUNK_MAX_CHARS = 1_200;
const CHUNK_MIN_CHARS = 40;

/** Components whose string props are lesson text (summaries, goals, comparisons). */
const TEXT_COMPONENTS = new Set(['Goals', 'Summary', 'Compare', 'Checklist', 'Steps']);

/** End of a JSX tag that starts at `from`: skips quoted strings and `{…}` expressions. */
function tagEnd(src: string, from: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let j = from; j < src.length; j++) {
    const ch = src[j];
    if (quote) {
      if (ch === '\\') j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return j;
  }
  return src.length - 1;
}

/** Sentences inside a component's props: quoted strings with a space, not ids. */
function propTexts(tag: string): string[] {
  const out: string[] = [];
  for (const m of tag.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
    const text = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1').trim();
    if (text.length >= 12 && text.includes(' ')) out.push(text);
  }
  return out;
}

/** JSX components → text: text-carrying props kept as a list, titles kept, the rest dropped. */
function stripComponents(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, lt);
    const name = /^<\/?([A-Z][A-Za-z]*)/.exec(src.slice(lt, lt + 40));
    if (!name) {
      out += '<';
      i = lt + 1;
      continue;
    }
    const end = tagEnd(src, lt + name[0].length);
    const tag = src.slice(lt, end + 1);
    const component = name[1] ?? '';
    if (tag.startsWith('</')) {
      // closing tag — its content stays
    } else if (tag.endsWith('/>')) {
      if (TEXT_COMPONENTS.has(component)) {
        const items = propTexts(tag);
        if (items.length) out += `\n\n${items.map((t) => `- ${t}`).join('\n')}\n\n`;
      }
    } else {
      const title = /\btitle="([^"]*)"/.exec(tag)?.[1];
      if (title) out += `${title}. `;
    }
    i = end + 1;
  }
  return out;
}

/** MDX → plain text: no imports, components, emphasis or link targets. */
export function mdxToText(mdx: string): string {
  const body = mdx
    .split('\n')
    .filter((line) => !/^(import|export)\s/.test(line))
    .join('\n');
  return stripComponents(body)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)\*(\S[^*\n]*?)\*/g, '$1$2')
    .replace(/^>\s?/gm, '')
    .split('\n')
    .map((line) => line.replace(/^[ \t]+/, '').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Splits text into parts of at most `max` characters on paragraph (then line) borders. */
export function splitText(text: string, max = CHUNK_MAX_CHARS): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let current = '';
  const pieces = text.split(/\n\n/).flatMap((p) => (p.length > max ? p.split('\n') : [p]));
  for (const piece of pieces) {
    const next = current ? `${current}\n\n${piece}` : piece;
    if (next.length > max && current) {
      parts.push(current);
      current = piece.slice(0, max);
    } else current = next.slice(0, max);
  }
  if (current) parts.push(current);
  return parts;
}

/** One lesson → excerpts by `##` section; the part before the first heading is the intro. */
export function lessonChunks(lesson: LessonSource): CourseChunk[] {
  const text = mdxToText(lesson.mdx);
  const sections: { heading: string | null; body: string }[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };
  const flush = () => {
    const body = current.lines.join('\n').trim();
    if (body) sections.push({ heading: current.heading, body });
  };
  for (const line of text.split('\n')) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      flush();
      current = { heading: (h[1] ?? '').trim(), lines: [] };
    } else current.lines.push(line.replace(/^#{3,}\s+/, ''));
  }
  flush();

  const chunks: CourseChunk[] = [];
  for (const { heading, body } of sections) {
    for (const part of splitText(body)) {
      if (part.length < CHUNK_MIN_CHARS) continue;
      chunks.push({
        id: `${lesson.id}#${chunks.length + 1}`,
        kind: 'lesson',
        ref: lesson.id,
        title: heading ? `${lesson.title} — ${heading}` : lesson.title,
        text: part,
      });
    }
  }
  return chunks;
}

export function termChunk(term: TermSource): CourseChunk {
  const names = term.aliases.length ? ` (${term.aliases.join(', ')})` : '';
  return {
    id: `term:${term.id}`,
    kind: 'term',
    ref: term.id,
    title: `Термин: ${term.term}${names}`,
    text: splitText(`${term.short}\n\n${term.full}`)[0] ?? term.short,
  };
}

export function cheatsheetChunks(sheet: CheatsheetSource): CourseChunk[] {
  return sheet.sections.map((section, i) => ({
    id: `cheatsheet:${sheet.id}#${i + 1}`,
    kind: 'cheatsheet' as const,
    ref: sheet.id,
    title: `Шпаргалка «${sheet.title}» — ${section.title}`,
    text: splitText(section.items.map((t) => `- ${t}`).join('\n'))[0] ?? '',
  }));
}

export function buildCourseChunks(sources: {
  lessons: readonly LessonSource[];
  terms: readonly TermSource[];
  cheatsheets: readonly CheatsheetSource[];
}): CourseChunk[] {
  return [
    ...sources.lessons.flatMap(lessonChunks),
    ...sources.terms.map(termChunk),
    ...sources.cheatsheets.flatMap(cheatsheetChunks),
  ].filter((c) => c.text.length > 0);
}
