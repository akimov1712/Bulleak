import type { GlossaryCategory, GlossaryTerm } from '@/types/glossary';

/**
 * Glossary. Terms are added together with the lesson that introduces them
 * (full list: docs/03-content/glossary-list.md).
 */
export const glossary: GlossaryTerm[] = [
  {
    id: 'trading',
    term: 'Трейдинг',
    aliases: ['trading', 'торговля'],
    short: 'Покупка и продажа актива ради заработка на изменении его цены.',
    full: 'Трейдинг — это заработок на движении цены за счёт серии сделок. Трейдер может зарабатывать как на росте (лонг), так и на падении цены (шорт).\n\nОт азартной игры трейдинг отличают преимущество стратегии, контроль риска в каждой сделке и дисциплина.',
    category: 'basics',
    related: ['investing', 'swing-trading', 'edge'],
    lessonId: 'm00-l01',
  },
  {
    id: 'investing',
    term: 'Инвестирование',
    aliases: ['investing', 'инвестиции'],
    short: 'Вложение денег на годы в расчёте на рост ценности актива.',
    full: 'Инвестор покупает актив надолго и редко принимает решения. Трейдер, наоборот, работает на горизонте от часов до недель и регулярно открывает и закрывает сделки по правилам.',
    category: 'basics',
    related: ['trading'],
    lessonId: 'm00-l01',
  },
  {
    id: 'swing-trading',
    term: 'Свинг-трейдинг',
    aliases: ['swing', 'свинг'],
    short: 'Стиль торговли, при котором сделки держат от нескольких дней до недель.',
    full: 'Свинг-трейдер ловит «качели» рынка — движения цены длиной в дни и недели. Анализ занимает 20–40 минут в день на таймфреймах 1H, 4H и 1D, поэтому стиль совместим с работой.\n\nЭто основной стиль нашего курса.',
    category: 'basics',
    related: ['scalping', 'trading'],
    lessonId: 'm00-l01',
  },
  {
    id: 'scalping',
    term: 'Скальпинг',
    aliases: ['scalping', 'скальп'],
    short: 'Сверхкороткие сделки длительностью от секунд до минут.',
    full: 'Скальпер открывает много сделок за день и зарабатывает на небольших движениях. Стиль требует постоянного внимания и сильно страдает от комиссий и проскальзывания, поэтому новичкам не подходит.',
    category: 'basics',
    related: ['swing-trading'],
    lessonId: 'm00-l01',
  },
  {
    id: 'volatility',
    term: 'Волатильность',
    aliases: ['volatility', 'изменчивость'],
    short: 'Насколько сильно и быстро меняется цена актива.',
    full: 'Высокая волатильность означает большие движения цены — это и возможности, и риск. Криптовалюты заметно волатильнее акций, поэтому контроль размера позиции в крипте особенно важен.',
    category: 'basics',
    related: ['trading'],
    lessonId: 'm00-l01',
  },
  {
    id: 'edge',
    term: 'Преимущество (edge)',
    aliases: ['edge', 'эдж', 'преимущество'],
    short:
      'Статистическое преимущество стратегии: на длинной дистанции она зарабатывает больше, чем теряет.',
    full: 'Edge — это причина, по которой стратегия прибыльна в среднем, а не в отдельной сделке. Его проверяют на истории и на демо-счёте, а измеряют матожиданием в R.\n\nБез преимущества трейдинг превращается в игру, где на длинной дистанции выигрывает только биржа за счёт комиссий.',
    category: 'strategy',
    related: ['trading'],
    lessonId: 'm00-l01',
  },
];

const byId = new Map(glossary.map((t) => [t.id, t]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return byId.get(id);
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, string> = {
  basics: 'Основы',
  exchange: 'Биржа и ордера',
  chart: 'График',
  indicators: 'Индикаторы',
  macro: 'Фундаментал',
  futures: 'Фьючерсы',
  risk: 'Риск',
  psychology: 'Психология',
  strategy: 'Стратегия',
};
