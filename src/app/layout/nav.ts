import {
  Award,
  BarChart3,
  BookOpen,
  CandlestickChart,
  ClipboardList,
  Calculator,
  Home,
  Info,
  Map,
  NotebookPen,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '../paths';

export type NavGroup = 'learn' | 'practice' | 'progress';

/** Sidebar sections, in display order. */
export const NAV_GROUPS: { id: NavGroup; label: string }[] = [
  { id: 'learn', label: 'Учёба' },
  { id: 'practice', label: 'Практика' },
  { id: 'progress', label: 'Прогресс' },
];

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar section (main navigation only). */
  group?: NavGroup;
  /** Shown in the 5-slot mobile bottom bar (the rest go to "Ещё"). */
  mobileBar?: boolean;
  /** Match only the exact path (for "/"). */
  end?: boolean;
}

export const mainNav: NavItem[] = [
  {
    to: paths.home(),
    label: 'Главная',
    icon: Home,
    group: 'learn',
    mobileBar: true,
    end: true,
  },
  {
    to: paths.path(),
    label: 'Карта курса',
    icon: Map,
    group: 'learn',
    mobileBar: true,
  },
  {
    to: paths.simulator(),
    label: 'Тренажёр',
    icon: CandlestickChart,
    group: 'practice',
    mobileBar: true,
  },
  { to: paths.tools(), label: 'Инструменты', icon: Calculator, group: 'practice' },
  {
    to: paths.journal(),
    label: 'Журнал',
    icon: NotebookPen,
    group: 'practice',
    mobileBar: true,
  },
  { to: paths.glossary(), label: 'Глоссарий', icon: BookOpen, group: 'learn' },
  { to: paths.cheatsheets(), label: 'Шпаргалки', icon: ScrollText, group: 'learn' },
  {
    to: paths.plan(),
    label: 'Торговый план',
    icon: ClipboardList,
    group: 'practice',
  },
  { to: paths.stats(), label: 'Статистика', icon: BarChart3, group: 'progress' },
  { to: paths.achievements(), label: 'Достижения', icon: Award, group: 'progress' },
];

export const secondaryNav: NavItem[] = [
  { to: paths.settings(), label: 'Настройки', icon: Settings },
  { to: paths.about(), label: 'О курсе', icon: Info },
];

export const mobileBarNav = mainNav.filter((item) => item.mobileBar);
export const mobileMoreNav = [...mainNav.filter((item) => !item.mobileBar), ...secondaryNav];
