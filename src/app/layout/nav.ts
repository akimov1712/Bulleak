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
  icon: LucideIcon;
  /** One line under the label in the section menu. */
  description?: string;
  /** Match only the exact path (for "/"). */
  end?: boolean;
}

export type NavSectionId = 'learn' | 'practice' | 'reference' | 'progress';

export interface NavSection {
  id: NavSectionId;
  label: string;
  items: NavItem[];
  /** Path prefixes that belong to the section (pages not in the menu: lessons, exams…). */
  prefixes: string[];
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
  icon: Map,
  description: '13 модулей: от основ до реальной торговли',
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
  icon: ClipboardList,
  description: 'Правила входа, риска и выхода',
};

/** Top navigation sections, in display order. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'learn',
    label: 'Обучение',
    items: [home, coursePath],
    prefixes: ['/path', '/module', '/lesson', '/exam'],
  },
  {
    id: 'practice',
    label: 'Практика',
    items: [simulator, journal, tools, plan],
    prefixes: ['/simulator', '/journal', '/tools', '/plan'],
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
    prefixes: ['/glossary', '/cheatsheets'],
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
      },
    ],
    prefixes: ['/stats', '/achievements', '/certificate'],
  },
];

/** Section that owns the current page ("/" counts as Обучение). */
export function sectionOf(pathname: string): NavSectionId | null {
  if (pathname === '/') return 'learn';
  const match = NAV_SECTIONS.find((s) =>
    s.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );
  return match?.id ?? null;
}

export const secondaryNav: NavItem[] = [
  { to: paths.settings(), label: 'Настройки', icon: Settings },
  { to: paths.about(), label: 'О курсе', icon: Info },
];

/** Mobile bottom bar: the most used pages; everything else is in the "Ещё" sheet. */
export const mobileBarNav: NavItem[] = [home, { ...coursePath, label: 'Курс' }, simulator, journal];
