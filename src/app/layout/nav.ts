import {
  Award,
  BarChart3,
  BookOpen,
  CandlestickChart,
  ClipboardList,
  Calculator,
  GraduationCap,
  Home,
  Info,
  Map,
  NotebookPen,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '../paths';

export interface NavItem {
  to: string;
  label: string;
  /** Shorter tab label for narrow desktops (< xl). */
  short?: string;
  icon: LucideIcon;
  /** One line under the label in the section menu. */
  description?: string;
  /** Match only the exact path (for "/"). */
  end?: boolean;
  /** Other path prefixes that count as this page (lessons and exams for the course map). */
  match?: string[];
  /** Not shown as a tab in the top bar (reachable from the profile menu). */
  hideInTabs?: boolean;
}

export type NavSectionId = 'learn' | 'practice' | 'reference' | 'progress';

export interface NavSection {
  id: NavSectionId;
  label: string;
  items: NavItem[];
}

const home: NavItem = {
  to: paths.home(),
  label: 'Главная',
  icon: Home,
  description: 'Продолжить урок, цель дня и серия',
  end: true,
};
const coursePath: NavItem = {
  to: paths.path(),
  label: 'Карта курса',
  short: 'Курс',
  icon: Map,
  description: '13 модулей: от основ до реальной торговли',
  match: ['/module', '/lesson', '/exam'],
};
const simulator: NavItem = {
  to: paths.simulator(),
  label: 'Тренажёр',
  icon: CandlestickChart,
  description: 'Сделки на реальной истории Bybit',
};
const journal: NavItem = {
  to: paths.journal(),
  label: 'Журнал',
  icon: NotebookPen,
  description: 'Записи сделок и разбор ошибок',
};
const tools: NavItem = {
  to: paths.tools(),
  label: 'Инструменты',
  icon: Calculator,
  description: 'Позиция, ликвидация, риск и комиссии',
};
const plan: NavItem = {
  to: paths.plan(),
  label: 'Торговый план',
  short: 'План',
  icon: ClipboardList,
  description: 'Правила входа, риска и выхода',
};

/** Navigation groups, in display order (tabs on desktop, the «Ещё» sheet on phones). */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'learn',
    label: 'Обучение',
    items: [home, coursePath],
  },
  {
    id: 'practice',
    label: 'Практика',
    items: [simulator, journal, tools, plan],
  },
  {
    id: 'reference',
    label: 'Справочник',
    items: [
      {
        to: paths.glossary(),
        label: 'Глоссарий',
        icon: BookOpen,
        description: 'Термины трейдинга простым языком',
      },
      {
        to: paths.cheatsheets(),
        label: 'Шпаргалки',
        icon: ScrollText,
        description: 'Краткие выжимки пройденных модулей',
      },
    ],
  },
  {
    id: 'progress',
    label: 'Прогресс',
    items: [
      {
        to: paths.stats(),
        label: 'Статистика',
        icon: BarChart3,
        description: 'Опыт, время и результаты тестов',
      },
      {
        to: paths.achievements(),
        label: 'Достижения',
        icon: Award,
        description: 'Награды за учёбу и практику',
      },
      {
        to: paths.certificate(),
        label: 'Сертификат',
        icon: GraduationCap,
        description: 'Откроется после финального экзамена',
        hideInTabs: true,
      },
    ],
  },
];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Whether a navigation item is the current page (its own path or one of `match`). */
export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return [item.to, ...(item.match ?? [])].some((p) => under(pathname, p));
}

export const secondaryNav: NavItem[] = [
  { to: paths.settings(), label: 'Настройки', icon: Settings },
  { to: paths.about(), label: 'О курсе', icon: Info },
];

/** Mobile bottom bar: the most used pages; everything else is in the "Ещё" sheet. */
export const mobileBarNav: NavItem[] = [home, { ...coursePath, label: 'Курс' }, simulator, journal];
