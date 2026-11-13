import { describe, expect, it } from 'vitest';
import {
  buildCourseChunks,
  CHUNK_MAX_CHARS,
  cheatsheetChunks,
  lessonChunks,
  mdxToText,
  splitText,
  termChunk,
} from './courseChunks';

const MDX = `import { X } from 'y';

<Goals
  items={[
    'Что такое таймфрейм и как свечи складываются',
    'id-like',
  ]}
/>

## Таймфрейм — это длина свечи

**<Term id="timeframe">Таймфрейм</Term>** — период одной свечи: [подробнее](/glossary/tf).

<Diagram name="tf-aggregation" />

<CandleChart
  dataset="BTCUSDT-240"
  caption="BTCUSDT > 4H: переключай вкладки"
  from={'2026-09-09'}
/>

<Warning title="Младший ТФ — не «точнее»">
  Деталей больше, а смысла — меньше.
</Warning>

## Шум

Чем меньше таймфрейм, тем больше *шума* — случайных колебаний цены.
`;

describe('mdxToText', () => {
  it('keeps prose, titles and text props, drops imports, charts and markup', () => {
    const text = mdxToText(MDX);
    expect(text).toContain('- Что такое таймфрейм и как свечи складываются');
    expect(text).not.toContain('id-like');
    expect(text).toContain('Таймфрейм — период одной свечи: подробнее.');
    expect(text).toContain('Младший ТФ — не «точнее».\nДеталей больше');
    expect(text).toContain('больше шума — случайных');
    for (const gone of ['import', 'BTCUSDT', '<', '**', '/glossary', 'tf-aggregation'])
      expect(text).not.toContain(gone);
  });
});

describe('lessonChunks', () => {
  it('cuts a lesson by its sections and names each excerpt', () => {
    const chunks = lessonChunks({ id: 'm03-l02', title: 'Таймфреймы', mdx: MDX });
    expect(chunks.map((c) => c.title)).toEqual([
      'Таймфреймы',
      'Таймфреймы — Таймфрейм — это длина свечи',
      'Таймфреймы — Шум',
    ]);
    expect(chunks.map((c) => c.id)).toEqual(['m03-l02#1', 'm03-l02#2', 'm03-l02#3']);
    expect(chunks.every((c) => c.kind === 'lesson' && c.ref === 'm03-l02')).toBe(true);
  });
});

describe('splitText', () => {
  it('splits long text on paragraphs and never exceeds the limit', () => {
    const para = 'слово '.repeat(60).trim();
    const parts = splitText(Array.from({ length: 10 }, () => para).join('\n\n'));
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= CHUNK_MAX_CHARS)).toBe(true);
    expect(splitText('коротко')).toEqual(['коротко']);
  });
});

describe('glossary and cheat sheets', () => {
  it('makes one excerpt per term and per cheat sheet section', () => {
    expect(
      termChunk({ id: 'sl', term: 'Стоп-лосс', aliases: ['SL'], short: 'Ордер.', full: 'Выход.' }),
    ).toEqual({
      id: 'term:sl',
      kind: 'term',
      ref: 'sl',
      title: 'Термин: Стоп-лосс (SL)',
      text: 'Ордер.\n\nВыход.',
    });
    const sheet = cheatsheetChunks({
      id: 'orders',
      title: 'Ордера',
      sections: [{ title: 'Основные', items: ['Рыночный', 'Лимитный'] }],
    });
    expect(sheet[0]).toMatchObject({ ref: 'orders', text: '- Рыночный\n- Лимитный' });
    expect(buildCourseChunks({ lessons: [], terms: [], cheatsheets: [] })).toEqual([]);
  });
});
