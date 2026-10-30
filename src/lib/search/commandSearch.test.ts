import { describe, expect, it } from 'vitest';
import { searchCommands, type CommandItem } from './commandSearch';

const items: CommandItem[] = [
  { id: 'term:stop', kind: 'term', title: 'Стоп-лосс', keywords: ['stop loss', 'SL'], to: '/g/sl' },
  { id: 'page:sim', kind: 'page', title: 'Тренажёр', subtitle: 'Сделки на истории', to: '/sim' },
  {
    id: 'lesson:l1',
    kind: 'lesson',
    title: 'Как поставить стоп',
    subtitle: 'Модуль 5. Риск',
    to: '/lesson/l1',
  },
  { id: 'tool:pos', kind: 'tool', title: 'Размер позиции', to: '/tools/position' },
  { id: 'term:ob', kind: 'term', title: 'Ордербук', subtitle: 'Стакан заявок', to: '/g/ob' },
];

const ids = (q: string) => searchCommands(items, q).map((i) => i.id);

describe('searchCommands', () => {
  it('returns nothing for an empty query', () => {
    expect(searchCommands(items, '  ')).toEqual([]);
  });

  it('ranks exact keyword matches first', () => {
    expect(ids('sl')[0]).toBe('term:stop');
  });

  it('matches word starts and orders ties by kind', () => {
    // Both start a word with «стоп»: lesson comes before term.
    expect(ids('стоп')).toEqual(['lesson:l1', 'term:stop']);
  });

  it('ignores case and ё/е', () => {
    expect(ids('ТРЕНАЖЕР')).toEqual(['page:sim']);
  });

  it('requires every word to match', () => {
    expect(ids('размер позиции')).toEqual(['tool:pos']);
    expect(ids('размер стопа')).toEqual([]);
  });

  it('falls back to the subtitle with the lowest rank', () => {
    expect(ids('стакан')).toEqual(['term:ob']);
    expect(ids('риск')).toEqual(['lesson:l1']);
  });

  it('respects the limit', () => {
    expect(searchCommands(items, 'о', 2)).toHaveLength(2);
  });
});
