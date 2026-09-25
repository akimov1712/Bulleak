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

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the 5-slot mobile bottom bar (the rest go to "Ещё"). */
  mobileBar?: boolean;
  /** Match only the exact path (for "/"). */
  end?: boolean;
}

export const mainNav: NavItem[] = [
  { to: paths.home(), label: 'Главная', icon: Home, mobileBar: true, end: true },
  { to: paths.path(), label: 'Карта курса', icon: Map, mobileBar: true },
  { to: paths.simulator(), label: 'Тренажёр', icon: CandlestickChart, mobileBar: true },
  { to: paths.tools(), label: 'Инструменты', icon: Calculator },
  { to: paths.journal(), label: 'Журнал', icon: NotebookPen, mobileBar: true },
  { to: paths.glossary(), label: 'Глоссарий', icon: BookOpen },
  { to: paths.cheatsheets(), label: 'Шпаргалки', icon: ScrollText },
  { to: paths.plan(), label: 'Торговый план', icon: ClipboardList },
  { to: paths.stats(), label: 'Статистика', icon: BarChart3 },
  { to: paths.achievements(), label: 'Достижения', icon: Award },
];

export const secondaryNav: NavItem[] = [
  { to: paths.settings(), label: 'Настройки', icon: Settings },
  { to: paths.about(), label: 'О курсе', icon: Info },
];

export const mobileBarNav = mainNav.filter((item) => item.mobileBar);
export const mobileMoreNav = [...mainNav.filter((item) => !item.mobileBar), ...secondaryNav];
