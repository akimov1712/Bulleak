import type { ComponentType } from 'react';
import { Flame, Receipt, Scale, Target, TrendingUp, type LucideIcon } from 'lucide-react';
import { CompoundingCalc } from './CompoundingCalc';
import { FeesCalc } from './FeesCalc';
import { LiquidationCalc } from './LiquidationCalc';
import { PositionCalc } from './PositionCalc';
import { RiskRewardCalc } from './RiskRewardCalc';

export interface CalculatorInfo {
  /** Used in /tools/:calcId, <CalcEmbed id> and the calculatorUsed event. */
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType;
}

/** All calculators in the order shown on /tools (docs/04-features/calculators.md). */
export const CALCULATOR_LIST: readonly CalculatorInfo[] = [
  {
    id: 'position',
    title: 'Размер позиции',
    description: 'Сколько монет брать, чтобы стоп стоил ровно запланированный риск.',
    icon: Scale,
    component: PositionCalc,
  },
  {
    id: 'liquidation',
    title: 'Цена ликвидации',
    description: 'Где биржа закроет позицию с плечом — и не дальше ли стоп.',
    icon: Flame,
    component: LiquidationCalc,
  },
  {
    id: 'rr',
    title: 'Риск / прибыль',
    description: 'R:R сделки и винрейт, при котором она выходит в ноль.',
    icon: Target,
    component: RiskRewardCalc,
  },
  {
    id: 'fees',
    title: 'Комиссии',
    description: 'Сколько съедают комиссии за вход и выход и какую долю риска.',
    icon: Receipt,
    component: FeesCalc,
  },
  {
    id: 'compounding',
    title: 'Сложный процент',
    description: 'Как растёт депозит — и какие ожидания реалистичны.',
    icon: TrendingUp,
    component: CompoundingCalc,
  },
];

export const CALCULATORS: Record<string, ComponentType> = Object.fromEntries(
  CALCULATOR_LIST.map((c) => [c.id, c.component]),
);

export const getCalculator = (id: string): CalculatorInfo | undefined =>
  CALCULATOR_LIST.find((c) => c.id === id);

export const isCalculatorId = (id: string) => getCalculator(id) !== undefined;
