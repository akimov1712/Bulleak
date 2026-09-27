import { describe, expect, it } from 'vitest';
import type { GlossaryTerm } from '@/types/glossary';
import { glossary } from '@/content/glossary';
import { alphabetGroups, indexLetter, normalize, searchTerms } from './search';

const t = (id: string, term: string, aliases: string[] = [], short = ''): GlossaryTerm => ({
  id,
  term,
  aliases,
  short,
  full: '',
  category: 'basics',
  related: [],
  lessonId: 'm00-l01',
});

const terms = [
  t('leverage', 'Кредитное плечо', ['leverage', 'плечо'], 'Заём биржи, увеличивающий позицию.'),
  t('stop', 'Стоп-лосс', ['SL', 'stop loss'], 'Ордер, ограничивающий убыток.'),
  t('hedge', 'Хеджирование', ['hedge'], 'Защита позиции встречной сделкой.'),
  t('yolka', 'Ёлочка', [], 'Выдуманный термин для проверки буквы ё.'),
  t('rsi', 'RSI', ['индекс относительной силы'], 'Осциллятор 0–100.'),
];
const ids = (list: GlossaryTerm[]) => list.map((x) => x.id);

describe('glossary search', () => {
  it('normalizes case, ё and spaces', () => {
    expect(normalize('  Ёлка   ВЕЛИКАЯ ')).toBe('елка великая');
  });

  it('empty query lists everything alphabetically', () => {
    expect(ids(searchTerms(terms, '  '))).toEqual(['yolka', 'leverage', 'stop', 'hedge', 'rsi']);
  });

  it('finds by name, alias and word start, ignoring case and ё/е', () => {
    expect(ids(searchTerms(terms, 'ПЛЕЧО'))).toEqual(['leverage']);
    expect(ids(searchTerms(terms, 'sl'))).toEqual(['stop']);
    expect(ids(searchTerms(terms, 'елочка'))).toEqual(['yolka']);
    expect(ids(searchTerms(terms, 'относительной'))).toEqual(['rsi']);
  });

  it('ranks names before definitions', () => {
    // «позиц» is only in definitions; «стоп» is a name
    expect(ids(searchTerms(terms, 'позиц'))).toEqual(['leverage', 'hedge']);
    expect(ids(searchTerms([...terms, t('x', 'Трейлинг', [], 'Подвижный стоп.')], 'стоп'))).toEqual(
      ['stop', 'x'],
    );
    expect(searchTerms(terms, 'нет такого')).toEqual([]);
  });

  it('alphabet index: Cyrillic first, ё under Е, Latin after', () => {
    expect(indexLetter(terms[3] as GlossaryTerm)).toBe('Е');
    expect(alphabetGroups(terms).map(([l]) => l)).toEqual(['Е', 'К', 'С', 'Х', 'R']);
  });

  it('every real term is findable by its own name', () => {
    for (const term of glossary) {
      expect(ids(searchTerms(glossary, term.term)), term.id).toContain(term.id);
    }
  });
});
