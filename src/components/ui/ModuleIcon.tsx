import { createElement } from 'react';
import {
  Activity,
  Bitcoin,
  BookOpen,
  Brain,
  Building2,
  CandlestickChart,
  Flag,
  Layers,
  Newspaper,
  Rocket,
  Shapes,
  Shield,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Icons referenced by name in course.ts (only these are bundled). */
const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  bitcoin: Bitcoin,
  'building-2': Building2,
  'candlestick-chart': CandlestickChart,
  shapes: Shapes,
  activity: Activity,
  layers: Layers,
  newspaper: Newspaper,
  zap: Zap,
  shield: Shield,
  brain: Brain,
  target: Target,
  flag: Flag,
};

/** Module icon by its name in course.ts (falls back to a book). */
export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  return createElement(ICONS[name] ?? BookOpen, {
    className,
    strokeWidth: 2.4,
    'aria-hidden': true,
  });
}
